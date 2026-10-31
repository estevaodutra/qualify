import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import {
  AiSkill,
  AiSkillVersion,
  AiModelProfile,
  AiExecution,
  AiGenerationParams,
  AiExecutionResult,
  AiSkillFile,
  AiSkillStatus,
} from "@/types/aiSkills";
import { resolveSkillSlugForAction } from "./actionRegistry";
import { ContextBuilder } from "./contextBuilder";

export interface SkillFilter {
  category?: string;
  status?: string;
  search?: string;
}

export interface ExecutionFilter {
  skillSlug?: string;
  companyId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface SystemStats {
  activeSkills: number;
  draftSkills: number;
  executionsToday: number;
  executions7Days: number;
  errorsCount: number;
  tokensConsumed: number;
  estimatedCost: number;
  topModel: string;
}

function formatKnownError(msg: string): string {
  const lower = String(msg || "").toLowerCase();
  if (
    lower.includes("credit_balance_exhausted") ||
    lower.includes("no credits remaining") ||
    lower.includes("insufficient_quota") ||
    lower.includes("billing")
  ) {
    return "A conta OpenAI configurada na plataforma Criafy está sem créditos (Saldo esgotado). Adicione créditos em https://platform.openai.com/settings/organization/billing ou atualize sua API Key em Super Admin > IA > Configurações.";
  }
  if (lower.includes("invalid_api_key") || lower.includes("incorrect api key")) {
    return "A API Key da OpenAI configurada na plataforma é inválida. Atualize-a em Super Admin > IA > Configurações.";
  }
  return msg;
}

async function extractErrorMessage(error: any, data?: any): Promise<string> {
  let errMsg = data?.error;
  if (!errMsg && error) {
    try {
      if ((error as any).context && typeof (error as any).context.json === "function") {
        const body = await (error as any).context.json();
        errMsg = body?.error || body?.message;
      }
    } catch {}
    if (!errMsg) {
      errMsg = error.message;
    }
  }
  if (!errMsg) {
    errMsg = "Erro desconhecido durante o processamento.";
  }
  return formatKnownError(errMsg);
}

export const AIExecutionService = {
  // ============================================================
  // 1. EXECUÇÃO CENTRALIZADA (Geração com OpenAI & Skills)
  // ============================================================
  async generate<T = any>(params: AiGenerationParams): Promise<AiExecutionResult<T>> {
    // 1. Resolver ação para slug de Skill
    const resolvedSlug = params.skillSlug || (params.action ? resolveSkillSlugForAction(params.action) : undefined);

    // 2. Chamar a Edge Function protegida do backend com credencial única Criafy
    const { data, error } = await supabase.functions.invoke("criafy-ai-generator", {
      body: {
        ...params,
        skillSlug: resolvedSlug,
      },
    });

    if (error || !data?.success) {
      const errMsg = await extractErrorMessage(error, data);
      throw new Error(errMsg);
    }

    return {
      success: true,
      result: data.result,
      structured_output: data.structured_output,
      execution_id: data.execution_id,
      skill: data.skill,
      model: data.model,
      model_profile: data.model_profile,
      tokens: data.tokens,
      latency_ms: data.latency_ms,
      estimated_cost: data.estimated_cost,
      billing: data.billing,
    };
  },

  // ============================================================
  // 2. CATÁLOGO DE SKILLS GLOBAIS
  // ============================================================
  async getSkills(filter?: SkillFilter): Promise<AiSkill[]> {
    let query = (supabase as any)
      .from("ai_skills")
      .select(`
        *,
        active_version:ai_skill_versions!fk_ai_skills_active_version(*)
      `)
      .order("created_at", { ascending: false });

    if (filter?.category && filter.category !== "ALL") {
      query = query.eq("category", filter.category);
    }

    if (filter?.status && filter.status !== "ALL") {
      query = query.eq("status", filter.status);
    }

    if (filter?.search) {
      query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%,slug.ilike.%${filter.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getSkillById(id: string): Promise<AiSkill | null> {
    const { data, error } = await (supabase as any)
      .from("ai_skills")
      .select(`
        *,
        active_version:ai_skill_versions!fk_ai_skills_active_version(*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getSkillBySlug(slug: string): Promise<AiSkill | null> {
    const { data, error } = await (supabase as any)
      .from("ai_skills")
      .select(`
        *,
        active_version:ai_skill_versions!fk_ai_skills_active_version(*)
      `)
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // ============================================================
  // 3. VERSIONAMENTO DE SKILLS (Imutabilidade de versões publicadas)
  // ============================================================
  async getSkillVersions(skillId: string): Promise<AiSkillVersion[]> {
    const { data, error } = await (supabase as any)
      .from("ai_skill_versions")
      .select("*")
      .eq("skill_id", skillId)
      .order("version", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createSkill(
    skillData: Partial<AiSkill>,
    initialFiles: AiSkillFile[] = []
  ): Promise<AiSkill> {
    // 1. Validar slug único
    const slug = (skillData.slug || skillData.name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) throw new Error("Slug é obrigatório.");

    // Gerar SKILL.md padrão se não estiver nos arquivos
    let manifestContent = skillData.main_instructions || "";
    const manifestFile = initialFiles.find((f) => f.name.toLowerCase() === "skill.md");
    if (manifestFile) {
      manifestContent = manifestFile.content;
    } else {
      manifestContent = `---
name: ${slug}
title: ${skillData.name}
category: ${skillData.category || "CONTEÚDO"}
version: 1.0.0
description: ${skillData.description || ""}
---

# ${skillData.name}

## Objetivo
${skillData.target_objective || ""}

## Quando Usar
${skillData.when_to_use || ""}

## Instruções
${skillData.main_instructions || ""}`;
      initialFiles.unshift({
        path: "SKILL.md",
        name: "SKILL.md",
        type: "manifest",
        content: manifestContent,
        size: manifestContent.length,
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Inserir Skill
    const { data: newSkill, error: skillError } = await (supabase as any)
      .from("ai_skills")
      .insert({
        slug,
        name: skillData.name,
        description: skillData.description || "",
        category: skillData.category || "CONTEÚDO",
        when_to_use: skillData.when_to_use || "",
        target_objective: skillData.target_objective || "",
        main_instructions: skillData.main_instructions || "",
        output_format: skillData.output_format || "json",
        output_schema: skillData.output_schema || {},
        default_model_profile: skillData.default_model_profile || "CONTENT_STANDARD",
        status: skillData.status || "draft",
        openai_skill_id: `skill_${slug.replace(/-/g, "_")}`,
        openai_default_version: "v1.0.0",
        openai_latest_version: "v1.0.0",
      })
      .select("*")
      .single();

    if (skillError || !newSkill) {
      throw new Error(skillError?.message || "Erro ao cadastrar Skill.");
    }

    // 3. Criar Versão 1 inicial
    const isPublished = newSkill.status === "published";
    const { data: versionRow, error: versionError } = await (supabase as any)
      .from("ai_skill_versions")
      .insert({
        skill_id: newSkill.id,
        version: 1,
        openai_version: "v1.0.0",
        manifest_content: manifestContent,
        files: initialFiles,
        changelog: "Versão inicial",
        status: isPublished ? "published" : "draft",
        published_at: isPublished ? new Date().toISOString() : null,
      })
      .select("*")
      .single();

    if (versionError || !versionRow) {
      throw new Error(versionError?.message || "Erro ao cadastrar versão inicial.");
    }

    // 4. Vincular versão ativa
    await (supabase as any)
      .from("ai_skills")
      .update({ active_version_id: versionRow.id })
      .eq("id", newSkill.id);

    return { ...newSkill, active_version_id: versionRow.id, active_version: versionRow };
  },

  async createNewVersion(
    skillId: string,
    params: {
      manifest_content: string;
      files: AiSkillFile[];
      changelog: string;
      status?: AiSkillStatus;
    }
  ): Promise<AiSkillVersion> {
    // Buscar maior versão existente
    const { data: existingVersions } = await (supabase as any)
      .from("ai_skill_versions")
      .select("version")
      .eq("skill_id", skillId)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = (existingVersions?.[0]?.version || 0) + 1;
    const openaiVersion = `v${nextVersion}.0.0`;

    const { data: newVersion, error } = await (supabase as any)
      .from("ai_skill_versions")
      .insert({
        skill_id: skillId,
        version: nextVersion,
        openai_version: openaiVersion,
        manifest_content: params.manifest_content,
        files: params.files,
        changelog: params.changelog || `Nova versão ${nextVersion}`,
        status: params.status || "draft",
      })
      .select("*")
      .single();

    if (error || !newVersion) {
      throw new Error(error?.message || "Erro ao criar nova versão da Skill.");
    }

    // Atualizar latest_version na skill
    await (supabase as any)
      .from("ai_skills")
      .update({
        openai_latest_version: openaiVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", skillId);

    return newVersion;
  },

  async publishVersion(skillId: string, versionId: string): Promise<void> {
    // 1. Obter versão a publicar
    const { data: versionRow, error: verErr } = await (supabase as any)
      .from("ai_skill_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    if (verErr || !versionRow) throw new Error("Versão não encontrada.");

    // 2. Atualizar status da versão para 'published' (imutável a partir de agora)
    await (supabase as any)
      .from("ai_skill_versions")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", versionId);

    // 3. Tornar esta a active_version_id da Skill e atualizar status da skill para 'published'
    await (supabase as any)
      .from("ai_skills")
      .update({
        active_version_id: versionId,
        status: "published",
        openai_default_version: versionRow.openai_version || `v${versionRow.version}.0.0`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", skillId);
  },

  async duplicateSkill(skillId: string): Promise<AiSkill> {
    const original = await this.getSkillById(skillId);
    if (!original) throw new Error("Skill original não encontrada.");

    const versions = await this.getSkillVersions(skillId);
    const activeVer = versions.find((v) => v.id === original.active_version_id) || versions[0];

    const newName = `${original.name} (Cópia)`;
    const newSlug = `${original.slug}-copia-${Math.random().toString(36).substring(2, 6)}`;

    return this.createSkill(
      {
        ...original,
        name: newName,
        slug: newSlug,
        status: "draft",
      },
      activeVer?.files || []
    );
  },

  async toggleSkillStatus(skillId: string, status: AiSkillStatus): Promise<void> {
    const { error } = await (supabase as any)
      .from("ai_skills")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", skillId);

    if (error) throw error;
  },

  // ============================================================
  // 4. MODEL PROFILES
  // ============================================================
  async getModelProfiles(): Promise<AiModelProfile[]> {
    const { data, error } = await (supabase as any)
      .from("ai_model_profiles")
      .select("*")
      .order("code", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async saveModelProfile(profile: Partial<AiModelProfile>): Promise<AiModelProfile> {
    if (profile.id) {
      const { data, error } = await (supabase as any)
        .from("ai_model_profiles")
        .update({
          name: profile.name,
          description: profile.description,
          model: profile.model,
          reasoning_effort: profile.reasoning_effort,
          max_output_tokens: profile.max_output_tokens,
          temperature: profile.temperature,
          timeout_seconds: profile.timeout_seconds,
          is_active: profile.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await (supabase as any)
        .from("ai_model_profiles")
        .insert({
          code: profile.code,
          name: profile.name,
          description: profile.description,
          provider: "openai",
          model: profile.model || "gpt-4o-mini",
          reasoning_effort: profile.reasoning_effort,
          max_output_tokens: profile.max_output_tokens || 2000,
          temperature: profile.temperature ?? 0.7,
          timeout_seconds: profile.timeout_seconds || 60,
          is_active: profile.is_active ?? true,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }
  },

  // ============================================================
  // 5. IMPORTAÇÃO E EXPORTAÇÃO DE ZIP (OpenAI Skills Bundle)
  // ============================================================
  async importZipSkill(file: File): Promise<{
    name: string;
    description: string;
    manifest_content: string;
    files: AiSkillFile[];
  }> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    const files: AiSkillFile[] = [];
    let manifestContent = "";

    const entries = Object.keys(contents.files);
    let skillMdFound = 0;

    for (const relativePath of entries) {
      const zipEntry = contents.files[relativePath];
      if (zipEntry.dir) continue;

      // Ignora arquivos de sistema como __MACOSX ou .DS_Store
      if (relativePath.includes("__MACOSX") || relativePath.includes(".DS_Store")) continue;

      const fileName = relativePath.split("/").pop() || relativePath;
      const content = await zipEntry.async("string");

      let fileType: "manifest" | "reference" | "asset" | "script" = "reference";
      if (fileName.toLowerCase() === "skill.md") {
        fileType = "manifest";
        manifestContent = content;
        skillMdFound++;
      } else if (relativePath.startsWith("references/")) {
        fileType = "reference";
      } else if (relativePath.startsWith("assets/")) {
        fileType = "asset";
      } else if (relativePath.startsWith("scripts/")) {
        fileType = "script";
      }

      files.push({
        path: relativePath,
        name: fileName,
        type: fileType,
        content,
        size: content.length,
        updatedAt: new Date().toISOString(),
      });
    }

    if (skillMdFound === 0) {
      throw new Error("O arquivo .zip deve conter obrigatoriamente um arquivo 'SKILL.md'.");
    }

    // Extrair nome ou descrição do frontmatter do SKILL.md se houver
    const nameMatch = manifestContent.match(/title:\s*(.+)/i) || manifestContent.match(/name:\s*(.+)/i);
    const descMatch = manifestContent.match(/description:\s*(.+)/i);

    const defaultName = nameMatch ? nameMatch[1].trim() : file.name.replace(/\.zip$/i, "");
    const defaultDesc = descMatch ? descMatch[1].trim() : "Skill importada via pacote .zip";

    return {
      name: defaultName,
      description: defaultDesc,
      manifest_content: manifestContent,
      files,
    };
  },

  async exportSkillZip(skill: AiSkill, version: AiSkillVersion): Promise<Blob> {
    const zip = new JSZip();

    // 1. Inserir SKILL.md
    zip.file("SKILL.md", version.manifest_content || skill.main_instructions || "");

    // 2. Inserir outros arquivos do bundle
    const filesList = Array.isArray(version.files) ? version.files : [];
    for (const f of filesList) {
      if (f.name.toLowerCase() === "skill.md") continue;
      zip.file(f.path, f.content);
    }

    return await zip.generateAsync({ type: "blob" });
  },

  // ============================================================
  // 6. GERAÇÃO ASSISTIDA DE SKILL COM IA
  // ============================================================
  async generateSkillScaffold(params: {
    scaffoldPrompt: string;
    documents?: Array<{ name: string; type: string; content: string }>;
  }) {
    const { data, error } = await supabase.functions.invoke("criafy-ai-generator", {
      body: {
        action: "generate_skill_scaffold",
        scaffoldPrompt: params.scaffoldPrompt,
        documents: params.documents,
      },
    });

    if (error || !data?.success) {
      const errMsg = await extractErrorMessage(error, data);
      throw new Error(errMsg);
    }

    return data.scaffold;
  },

  // ============================================================
  // 7. EXECUÇÕES & LOGS (Rastreabilidade completa)
  // ============================================================
  async getExecutions(filter?: ExecutionFilter): Promise<{ executions: AiExecution[]; total: number }> {
    let query = (supabase as any)
      .from("ai_executions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filter?.skillSlug) {
      query = query.eq("skill_slug", filter.skillSlug);
    }

    if (filter?.companyId) {
      query = query.eq("company_id", filter.companyId);
    }

    if (filter?.status && filter.status !== "ALL") {
      query = query.eq("status", filter.status);
    }

    const limit = filter?.limit || 20;
    const page = filter?.page || 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { executions: data || [], total: count || 0 };
  },

  // ============================================================
  // 8. VISÃO GERAL & MÉTRICAS REAIS
  // ============================================================
  async getStats(): Promise<SystemStats> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Contagem de skills
    const { count: activeCount } = await (supabase as any)
      .from("ai_skills")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");

    const { count: draftCount } = await (supabase as any)
      .from("ai_skills")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft");

    // Execuções hoje
    const { count: countToday } = await (supabase as any)
      .from("ai_executions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    // Execuções 7 dias
    const { data: executions7d } = await (supabase as any)
      .from("ai_executions")
      .select("model, tokens_input, tokens_output, estimated_cost, status")
      .gte("created_at", sevenDaysAgo.toISOString());

    let totalTokens = 0;
    let totalCost = 0;
    let errorCount = 0;
    const modelUsageCount: Record<string, number> = {};

    (executions7d || []).forEach((e: any) => {
      totalTokens += (e.tokens_input || 0) + (e.tokens_output || 0);
      totalCost += Number(e.estimated_cost || 0);
      if (e.status === "error") errorCount++;
      if (e.model) {
        modelUsageCount[e.model] = (modelUsageCount[e.model] || 0) + 1;
      }
    });

    let topModel = "gpt-4o-mini";
    let maxModelCount = 0;
    for (const [m, count] of Object.entries(modelUsageCount)) {
      if (count > maxModelCount) {
        maxModelCount = count;
        topModel = m;
      }
    }

    return {
      activeSkills: activeCount || 0,
      draftSkills: draftCount || 0,
      executionsToday: countToday || 0,
      executions7Days: executions7d?.length || 0,
      errorsCount: errorCount,
      tokensConsumed: totalTokens,
      estimatedCost: totalCost,
      topModel,
    };
  },

  // ============================================================
  // 9. CONFIGURAÇÃO OPENAI & TESTE DE CONEXÃO
  // ============================================================
  async getOpenAiConfig(): Promise<{
    configured: boolean;
    maskedKey?: string;
    projectId?: string;
    orgId?: string;
    defaultModel?: string;
    monthlySpendLimit?: number;
    lastValidatedAt?: string;
    status: string;
  }> {
    const { data } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", "openai_config")
      .maybeSingle();

    const val = data?.value || {};
    const key = val.api_key || "";
    let maskedKey = "";
    if (key.length > 8) {
      maskedKey = `${key.slice(0, 7)}...${key.slice(-4)}`;
    }

    return {
      configured: !!key,
      maskedKey,
      projectId: val.project_id || "",
      orgId: val.organization_id || "",
      defaultModel: val.default_model || "gpt-4o-mini",
      monthlySpendLimit: val.monthly_spend_limit || 500,
      lastValidatedAt: val.last_validated_at || "",
      status: val.status || (key ? "configured" : "not_configured"),
    };
  },

  async saveOpenAiConfig(config: {
    apiKey?: string;
    projectId?: string;
    organizationId?: string;
    defaultModel?: string;
    monthlySpendLimit?: number;
  }): Promise<void> {
    const { data: current } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", "openai_config")
      .maybeSingle();

    const existing = current?.value || {};
    const newConfig = {
      ...existing,
      api_key: config.apiKey?.trim() ? config.apiKey.trim() : existing.api_key,
      project_id: config.projectId ?? existing.project_id ?? "",
      organization_id: config.organizationId ?? existing.organization_id ?? "",
      default_model: config.defaultModel ?? existing.default_model ?? "gpt-4o-mini",
      monthly_spend_limit: config.monthlySpendLimit ?? existing.monthly_spend_limit ?? 500,
      status: "configured",
    };

    const { error } = await (supabase as any).from("platform_settings").upsert(
      {
        key: "openai_config",
        value: newConfig,
        description: "Configuração global da OpenAI exclusiva para o motor de IA e Skills da Criafy",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) throw error;
  },

  async validateOpenAiConnection(): Promise<{ success: boolean; modelsCount: number }> {
    const { data, error } = await supabase.functions.invoke("criafy-ai-generator", {
      body: { action: "validate_connection" },
    });

    if (error || !data?.success) {
      const errMsg = await extractErrorMessage(error, data);
      throw new Error(errMsg);
    }

    // Atualizar last_validated_at em platform_settings
    const { data: current } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", "openai_config")
      .maybeSingle();

    if (current?.value) {
      await (supabase as any)
        .from("platform_settings")
        .update({
          value: {
            ...current.value,
            last_validated_at: new Date().toISOString(),
            status: "connected",
          },
        })
        .eq("key", "openai_config");
    }

    return {
      success: true,
      modelsCount: data.total_models_available || 0,
    };
  },
};
