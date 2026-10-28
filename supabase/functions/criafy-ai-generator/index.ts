import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTION_SKILL_MAP: Record<string, string> = {
  generate_reel: "reel-scriptwriter",
  generate_stories_lite: "stories-lite",
  generate_carousel: "carousel-writer",
  generate_static_post: "static-post-writer",
  plan_week: "editorial-planner",
  strategist_chat: "digital-strategist",
};

// Estimativa de custo por 1k tokens em dólares
function calculateCost(model: string, inTokens: number, outTokens: number): number {
  let inCostPerM = 0.15;
  let outCostPerM = 0.60;
  if (model.includes("gpt-4o") && !model.includes("mini")) {
    inCostPerM = 2.50;
    outCostPerM = 10.00;
  } else if (model.includes("o3") || model.includes("o1")) {
    inCostPerM = 1.10;
    outCostPerM = 4.40;
  }
  return (inTokens * inCostPerM + outTokens * outCostPerM) / 1_000_000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let executionId: string | null = null;
  let adminClient: any = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Autenticar usuário
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const {
      action,
      skillSlug,
      skillId,
      skillVersion,
      companyId,
      accountId,
      contentId,
      theme,
      objective,
      angle,
      cta,
      customInstruction,
      format,
      publicationType,
      promptType,
      scaffoldPrompt,
      documents = [],
    } = body;

    // 2. Resolver Credencial Global da OpenAI (Criafy Platform Key)
    let openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    let openAiProjectId = "";
    let openAiOrgId = "";

    const { data: settingRow } = await adminClient
      .from("platform_settings")
      .select("value")
      .eq("key", "openai_config")
      .maybeSingle();

    if (settingRow?.value?.api_key) {
      openAiApiKey = settingRow.value.api_key;
      openAiProjectId = settingRow.value.project_id || "";
      openAiOrgId = settingRow.value.organization_id || "";
    }

    // Fallback legado de company_credentials se não houver chave global
    if (!openAiApiKey && companyId) {
      const { data: cred } = await adminClient
        .from("company_credentials")
        .select("encrypted_key")
        .eq("company_id", companyId)
        .eq("service_name", "openai")
        .eq("is_active", true)
        .maybeSingle();
      if (cred?.encrypted_key) {
        openAiApiKey = cred.encrypted_key;
      }
    }

    if (!openAiApiKey) {
      throw new Error(
        "Nenhuma API Key da OpenAI configurada na plataforma Criafy. Configure em Super Admin > IA > Configurações."
      );
    }

    // -------------------------------------------------------------
    // ROTA ESPECIAL: VALIDAR CONEXÃO (Super Admin > IA > Configurações)
    // -------------------------------------------------------------
    if (action === "validate_connection") {
      const testResp = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          ...(openAiProjectId ? { "OpenAI-Project": openAiProjectId } : {}),
          ...(openAiOrgId ? { "OpenAI-Organization": openAiOrgId } : {}),
        },
      });
      const testData = await testResp.json();
      if (!testResp.ok || testData.error) {
        throw new Error(testData.error?.message || "Falha ao validar credencial com OpenAI");
      }
      return new Response(
        JSON.stringify({
          success: true,
          status: "connected",
          total_models_available: testData.data?.length || 0,
          validated_at: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------
    // ROTA ESPECIAL: GERAR ESTRUTURA DA SKILL COM IA (Modo Assistido)
    // -------------------------------------------------------------
    if (action === "generate_skill_scaffold") {
      const promptDocText = (documents || [])
        .map((d: any) => `DOCUMENTO: ${d.name} (${d.type || "reference"})\n${d.content || ""}`)
        .join("\n\n---\n\n");

      const scaffoldSystem = `Você é o Arquiteto de OpenAI Skills da Criafy.
Sua função é gerar o pacote estrutural de uma Skill global de alta qualidade.
Você deve retornar ESTRITAMENTE um objeto JSON com as seguintes chaves:
{
  "manifest_content": "Conteúdo formatado do SKILL.md contendo frontmatter e instruções completas",
  "main_instructions": "Instruções operacionais principais para o modelo executar a tarefa",
  "when_to_use": "Quando e em quais situações exatas esta Skill deve ser acionada",
  "target_objective": "Objetivo mensurável de impacto e retenção da Skill",
  "output_format": "json",
  "output_schema": { "chave1": "descrição", "chave2": "descrição" },
  "suggested_profile": "CONTENT_STANDARD ou CONTENT_ADVANCED ou STRATEGY_ADVANCED",
  "references": [
    { "path": "references/nome-do-arquivo.md", "name": "nome-do-arquivo.md", "content": "conteúdo detalhado de apoio" }
  ],
  "assets": [
    { "path": "assets/template-exemplo.md", "name": "template-exemplo.md", "content": "exemplo prático de saída esperada" }
  ]
}`;

      const scaffoldUser = `Requisito da Skill:
${scaffoldPrompt || "Crie uma Skill especializada com base nos documentos fornecidos."}

Documentos e Referências de Entrada:
${promptDocText || "Nenhum documento adicional. Crie com base nas melhores práticas do mercado."}`;

      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
          ...(openAiProjectId ? { "OpenAI-Project": openAiProjectId } : {}),
        },
        body: JSON.stringify({
          model: "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: scaffoldSystem },
            { role: "user", content: scaffoldUser },
          ],
          temperature: 0.6,
        }),
      });

      const aiData = await aiResp.json();
      if (!aiResp.ok || aiData.error) {
        throw new Error(aiData.error?.message || "Erro ao gerar scaffold da Skill.");
      }

      const parsed = JSON.parse(aiData.choices[0].message.content);
      return new Response(JSON.stringify({ success: true, scaffold: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -------------------------------------------------------------
    // FLUXO PRINCIPAL: EXECUÇÃO VIA AIExecutionService
    // -------------------------------------------------------------

    // 3. Resolver Skill e Ação pelo Action Registry
    let targetSlug = skillSlug;
    if (!targetSlug && action && ACTION_SKILL_MAP[action]) {
      targetSlug = ACTION_SKILL_MAP[action];
    } else if (!targetSlug && !skillId) {
      // Fallback para publicação clássica Criafy se nenhum slug foi passado
      if (publicationType === "REEL" || promptType === "HOOKS") {
        targetSlug = "reel-scriptwriter";
      } else if (publicationType === "STORY") {
        targetSlug = "stories-lite";
      } else {
        targetSlug = "static-post-writer";
      }
    }

    // 4. Buscar Skill no Banco
    let skillQuery = adminClient.from("ai_skills").select("*");
    if (skillId) {
      skillQuery = skillQuery.eq("id", skillId);
    } else if (targetSlug) {
      skillQuery = skillQuery.eq("slug", targetSlug);
    }

    const { data: skill, error: skillFetchError } = await skillQuery.maybeSingle();

    if (skillFetchError || !skill) {
      throw new Error(`Skill '${targetSlug || skillId}' não encontrada no catálogo global.`);
    }

    // 5. Buscar Versão (ativa por padrão, ou versão explícita solicitada)
    let versionQuery = adminClient.from("ai_skill_versions").select("*").eq("skill_id", skill.id);
    if (skillVersion) {
      versionQuery = versionQuery.eq("version", Number(skillVersion));
    } else if (skill.active_version_id) {
      versionQuery = versionQuery.eq("id", skill.active_version_id);
    } else {
      versionQuery = versionQuery.order("version", { ascending: false }).limit(1);
    }

    const { data: versionRow, error: versionFetchError } = await versionQuery.maybeSingle();
    const effectiveVersion = versionRow || {
      version: 1,
      manifest_content: skill.main_instructions || "",
      files: [],
      openai_version: skill.openai_default_version || "v1",
    };

    // 6. Buscar Perfil de Modelo (ai_model_profiles)
    const profileCode = skill.default_model_profile || "CONTENT_STANDARD";
    const { data: modelProfile } = await adminClient
      .from("ai_model_profiles")
      .select("*")
      .eq("code", profileCode)
      .maybeSingle();

    const selectedModel = modelProfile?.model || "gpt-4o-mini";
    const selectedTemp = Number(modelProfile?.temperature ?? 0.7);
    const selectedMaxTokens = Number(modelProfile?.max_output_tokens ?? 2000);
    const selectedReasoning = modelProfile?.reasoning_effort || undefined;

    // 7. ContextBuilder — Montar CONTEXT PACKAGE com isolamento seguro de tenant
    let brandManualContext: any = {};
    let accountStrategyContext: any = {};
    let accountInfo: any = {};
    let companyInfo: any = {};

    if (companyId) {
      const { data: comp } = await adminClient
        .from("companies")
        .select("id, name, cnpj")
        .eq("id", companyId)
        .maybeSingle();
      companyInfo = comp || {};

      // Buscar Brand Manual do Sprint OS ou das configurações da empresa
      const { data: sprintWs } = await adminClient
        .from("sprint_os_workspaces")
        .select("data")
        .eq("company_id", companyId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sprintWs?.data?.brandManual) {
        brandManualContext = sprintWs.data.brandManual;
      }
    }

    if (accountId) {
      const { data: acc } = await adminClient
        .from("criafy_instagram_accounts")
        .select("id, username, name, account_type")
        .eq("id", accountId)
        .maybeSingle();
      accountInfo = acc || {};

      const { data: briefing } = await adminClient
        .from("criafy_account_briefings")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();

      if (briefing) {
        accountStrategyContext = {
          brand_name: briefing.brand_name || accountInfo.name || accountInfo.username,
          about: briefing.about,
          objective: briefing.objective,
          target_audience: briefing.target_audience,
          brand_positioning: briefing.brand_positioning,
          tone_of_voice: briefing.tone_of_voice,
          allowed_topics: briefing.allowed_topics,
          forbidden_topics: briefing.forbidden_topics,
          preferred_vocabulary: briefing.preferred_vocabulary,
          forbidden_vocabulary: briefing.forbidden_vocabulary,
          preferred_ctas: briefing.preferred_ctas,
          free_ai_context: briefing.free_ai_context,
        };
      }
    }

    // Contexto de Conteúdo de mídia anexado (se houver)
    let contentMediaContext: any = null;
    if (contentId) {
      const { data: media } = await adminClient
        .from("criafy_contents")
        .select("title, media_type, duration_seconds, aspect_ratio, ai_analysis")
        .eq("id", contentId)
        .maybeSingle();
      contentMediaContext = media;
    }

    const contextPackage = {
      company: {
        id: companyInfo.id,
        name: companyInfo.name,
        brand_manual: brandManualContext,
      },
      account: {
        id: accountInfo.id,
        username: accountInfo.username,
        network: "instagram",
        strategy: accountStrategyContext,
      },
      content_request: {
        format: format || publicationType || "REEL",
        theme: theme || customInstruction || "Conteúdo relevante de alta retenção",
        objective: objective || accountStrategyContext.objective || "Engajamento e autoridade",
        angle: angle || "",
        cta: cta || "",
        custom_instruction: customInstruction || "",
      },
      media_reference: contentMediaContext,
    };

    // 8. Montar Prompt do Modelo com Skill Global + Context Package
    const filesList = Array.isArray(effectiveVersion.files) ? effectiveVersion.files : [];
    const referencesText = filesList
      .filter((f: any) => f.type === "reference" || f.path?.startsWith("references/"))
      .map((f: any) => `### DOCUMENTO DE REFERÊNCIA: ${f.name}\n${f.content}`)
      .join("\n\n");

    const assetsText = filesList
      .filter((f: any) => f.type === "asset" || f.path?.startsWith("assets/"))
      .map((f: any) => `### TEMPLATE / EXEMPLO: ${f.name}\n${f.content}`)
      .join("\n\n");

    const systemPrompt = `Você é o motor de IA oficial da plataforma Criafy, operando com a Skill: "${skill.name}" (Slug: ${skill.slug}, Versão: ${effectiveVersion.version}).

============================================================
INSTRUÇÃO DE EXECUÇÃO DA SKILL:
============================================================
Use a Skill "${skill.name}" para executar esta tarefa com máxima fidelidade às suas regras, estrutura e referências.

MANIFESTO DA SKILL (SKILL.md):
${effectiveVersion.manifest_content || skill.main_instructions || ""}

${referencesText ? `\nARQUIVOS DE REFERÊNCIA DA SKILL:\n${referencesText}\n` : ""}
${assetsText ? `\nASSETS E TEMPLATES DA SKILL:\n${assetsText}\n` : ""}

REGRAS DE CONTRATO DE SAÍDA:
- Formato exigido: ${skill.output_format === "json" ? "JSON ESTRUTURADO" : skill.output_format.toUpperCase()}
- Schema esperado:
${JSON.stringify(skill.output_schema || {}, null, 2)}
- Retorne APENAS o JSON válido sem tags markdown adicionais quando solicitado em formato JSON.`;

    const userPrompt = `============================================================
CONTEXT PACKAGE (EMPRESA + CONTA + BRIEFING ATUAL):
============================================================
${JSON.stringify(contextPackage, null, 2)}

INSTRUÇÃO ESPECÍFICA DA EXECUÇÃO:
- Tema: ${contextPackage.content_request.theme}
- Objetivo: ${contextPackage.content_request.objective}
${angle ? `- Ângulo Estratégico: ${angle}` : ""}
${cta ? `- CTA Desejado: ${cta}` : ""}
${customInstruction ? `- Instrução Adicional: ${customInstruction}` : ""}

Execute a Skill "${skill.name}" respeitando estritamente o Manual da Marca e o Tom de Voz do Context Package.`;

    // 9. Chamada OpenAI API com Retry Controlado
    let openAiData: any = null;
    let attempt = 1;
    const maxAttempts = 2;
    let lastError: any = null;

    const requestBody: any = {
      model: selectedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: selectedMaxTokens,
    };

    // reasoning_effort para modelos o1/o3
    if (selectedReasoning && (selectedModel.includes("o1") || selectedModel.includes("o3"))) {
      requestBody.reasoning_effort = selectedReasoning;
    } else {
      requestBody.temperature = selectedTemp;
    }

    if (skill.output_format === "json" && !selectedModel.includes("o1-mini")) {
      requestBody.response_format = { type: "json_object" };
    }

    while (attempt <= maxAttempts) {
      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiApiKey}`,
            "Content-Type": "application/json",
            ...(openAiProjectId ? { "OpenAI-Project": openAiProjectId } : {}),
            ...(openAiOrgId ? { "OpenAI-Organization": openAiOrgId } : {}),
          },
          body: JSON.stringify(requestBody),
        });

        openAiData = await resp.json();
        if (!resp.ok || openAiData.error) {
          throw new Error(openAiData.error?.message || `OpenAI status ${resp.status}`);
        }
        break; // Sucesso
      } catch (err: any) {
        lastError = err;
        attempt++;
        if (attempt <= maxAttempts) {
          await new Promise((r) => setTimeout(r, 1200)); // Pequena pausa antes de retentar
        }
      }
    }

    if (!openAiData || openAiData.error) {
      throw new Error(`Falha na OpenAI após ${maxAttempts} tentativas: ${lastError?.message}`);
    }

    const latencyMs = Date.now() - startTime;
    const rawContent = openAiData.choices?.[0]?.message?.content?.trim() || "";
    const inTokens = openAiData.usage?.prompt_tokens || 0;
    const outTokens = openAiData.usage?.completion_tokens || 0;
    const estimatedCost = calculateCost(selectedModel, inTokens, outTokens);

    // 10. Validar e Formatar Output
    let parsedOutput: any = rawContent;
    if (skill.output_format === "json") {
      try {
        parsedOutput = JSON.parse(rawContent);
      } catch {
        // Se a resposta vier envolvida em blocos ```json ... ```
        const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            parsedOutput = JSON.parse(jsonMatch[1]);
          } catch {
            parsedOutput = { content: rawContent };
          }
        } else {
          parsedOutput = { content: rawContent };
        }
      }
    }

    // 11. Persistir Registro em ai_executions (Logs e Rastreabilidade)
    const { data: executionRow } = await adminClient
      .from("ai_executions")
      .insert({
        company_id: companyId || null,
        account_id: accountId || null,
        user_id: user.id || null,
        action: action || `execute_${skill.slug}`,
        skill_id: skill.id,
        skill_slug: skill.slug,
        skill_version: effectiveVersion.version,
        openai_skill_id: skill.openai_skill_id,
        openai_version: effectiveVersion.openai_version,
        model_profile: profileCode,
        model: selectedModel,
        input_summary: {
          theme: contextPackage.content_request.theme,
          objective: contextPackage.content_request.objective,
          format: contextPackage.content_request.format,
          has_brand_manual: !!brandManualContext?.fields?.length,
          has_account_strategy: !!accountStrategyContext?.brand_name,
        },
        output: typeof parsedOutput === "object" ? parsedOutput : { text: parsedOutput },
        raw_response: rawContent,
        status: "success",
        tokens_input: inTokens,
        tokens_output: outTokens,
        estimated_cost: estimatedCost,
        latency_ms: latencyMs,
        attempt: attempt > 1 ? attempt : 1,
      })
      .select("id")
      .maybeSingle();

    executionId = executionRow?.id || null;

    // 12. Retorno com suporte retrocompatível para generateAiCopy (result string ou json)
    const formattedResult =
      typeof parsedOutput === "string"
        ? parsedOutput
        : parsedOutput?.caption || parsedOutput?.script || JSON.stringify(parsedOutput, null, 2);

    return new Response(
      JSON.stringify({
        success: true,
        result: formattedResult,
        structured_output: parsedOutput,
        execution_id: executionId,
        skill: {
          id: skill.id,
          slug: skill.slug,
          name: skill.name,
          version: effectiveVersion.version,
        },
        model: selectedModel,
        model_profile: profileCode,
        tokens: {
          input: inTokens,
          output: outTokens,
          total: inTokens + outTokens,
        },
        latency_ms: latencyMs,
        estimated_cost: estimatedCost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    // Log do erro se possível
    if (adminClient) {
      try {
        await adminClient.from("ai_executions").insert({
          action: "failed_execution",
          skill_slug: "unknown",
          skill_version: 1,
          model_profile: "CONTENT_STANDARD",
          model: "gpt-4o-mini",
          status: "error",
          error: err.message,
          latency_ms: latencyMs,
        });
      } catch {
        // Ignora erro ao salvar log de erro
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
