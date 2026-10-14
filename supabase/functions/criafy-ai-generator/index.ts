import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const {
      companyId,
      accountId,
      contentId,
      promptType = "CAPTION",
      publicationType = "REEL",
      customInstruction = "",
    } = body;

    if (!companyId || !accountId) {
      throw new Error("companyId and accountId are required");
    }

    // 1. Obter credencial da OpenAI da empresa em company_credentials
    const { data: cred } = await adminClient
      .from("company_credentials")
      .select("encrypted_key, settings")
      .eq("company_id", companyId)
      .eq("service_name", "openai")
      .eq("is_active", true)
      .maybeSingle();

    const openAiApiKey = cred?.encrypted_key || Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      throw new Error(
        "Nenhuma chave da OpenAI encontrada. Configure sua API Key da empresa em Configurações > Credenciais de IA (/settings/credentials)."
      );
    }

    const aiModel = cred?.settings?.default_model || "gpt-4o-mini";

    // 2. Obter Briefing permanente da conta
    const { data: briefing } = await adminClient
      .from("criafy_account_briefings")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    // 3. Obter dados da conta do Instagram
    const { data: account } = await adminClient
      .from("criafy_instagram_accounts")
      .select("username, name")
      .eq("id", accountId)
      .single();

    // 4. Obter dados do Conteúdo de mídia (se fornecido)
    let contentData: any = null;
    if (contentId) {
      const { data: content } = await adminClient
        .from("criafy_contents")
        .select("title, media_type, duration_seconds, aspect_ratio")
        .eq("id", contentId)
        .maybeSingle();
      contentData = content;
    }

    // 5. Montar System Prompt com contexto estrito do Briefing
    const brandName = briefing?.brand_name || account?.name || `@${account?.username}`;
    const tone = briefing?.tone_of_voice || "Profissional, moderno e engajador";
    const audience = briefing?.target_audience || "Público geral interessado no tema";
    const allowedTopics = (briefing?.allowed_topics || []).join(", ");
    const forbiddenTopics = (briefing?.forbidden_topics || []).join(", ");
    const preferredVocabulary = (briefing?.preferred_vocabulary || []).join(", ");
    const forbiddenVocabulary = (briefing?.forbidden_vocabulary || []).join(", ");
    const preferredCtas = (briefing?.preferred_ctas || []).join(", ");
    const freeContext = briefing?.free_ai_context || "";

    const systemPrompt = `Você é o estrategista de conteúdo e copywriter oficial da conta @${account?.username} no Instagram, operando dentro do Criafy.

DIRETRIZES DA MARCA & BRIEFING DA CONTA:
- Marca / Conta: ${brandName}
- Tom de Voz: ${tone}
- Público-Alvo: ${audience}
${briefing?.about ? `- Sobre o negócio: ${briefing.about}` : ""}
${briefing?.objective ? `- Objetivo da conta: ${briefing.objective}` : ""}
${allowedTopics ? `- Assuntos Permitidos: ${allowedTopics}` : ""}
${forbiddenTopics ? `- ASSUNTOS ESTRITAMENTE PROIBIDOS: ${forbiddenTopics}` : ""}
${preferredVocabulary ? `- Vocabulário e Termos Preferidos: ${preferredVocabulary}` : ""}
${forbiddenVocabulary ? `- PALAVRAS E EXPRESSÕES ESTRITAMENTE PROIBIDAS: ${forbiddenVocabulary}` : ""}
${preferredCtas ? `- CTAs Recomendados: ${preferredCtas}` : ""}
${freeContext ? `- Instruções Adicionais da Marca: ${freeContext}` : ""}

FORMATO DE DESTINO:
- Tipo de publicação: ${publicationType} (Reel / Feed / Story)
${contentData ? `- Mídia de referência: ${contentData.media_type}, título: "${contentData.title || ""}"` : ""}

REGRAS DE OURO:
1. Nunca use as palavras proibidas.
2. Respeite fielmente o tom de voz e o objetivo da conta.
3. Se for Reel, comece com um gancho muito forte na primeira linha.
4. Inclua espaçamento visual adequado para leitura no celular, emojis pontuais e termine com um CTA claro e hashtags relevantes.`;

    const userPrompt = `Gere o texto para publicação do tipo ${publicationType}.
${customInstruction ? `Instrução específica do operador: ${customInstruction}` : "Crie uma copy de alta conversão, engajamento e alinhada ao briefing da conta."}`;

    // 6. Chamada à OpenAI API
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const openAiData = await openAiResponse.json();

    if (openAiData.error) {
      throw new Error(`OpenAI API Error: ${openAiData.error.message}`);
    }

    const generatedText = openAiData.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({
        success: true,
        result: generatedText,
        model: aiModel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
