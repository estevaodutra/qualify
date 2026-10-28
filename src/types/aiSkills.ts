export type AiSkillCategory = "CONTEÚDO" | "ESTRATÉGIA" | "ANÁLISE";

export type AiSkillStatus = "draft" | "testing" | "published" | "deprecated" | "disabled";

export type AiExecutionStatus = "success" | "error" | "retrying";

export type AiFileType = "manifest" | "reference" | "asset" | "script";

export interface AiSkillFile {
  path: string;
  name: string;
  type: AiFileType;
  content: string;
  size: number;
  updatedAt: string;
}

export interface AiModelProfile {
  id: string;
  code: string;
  name: string;
  description?: string;
  provider: "openai";
  model: string;
  reasoning_effort?: "low" | "medium" | "high" | null;
  max_output_tokens: number;
  temperature: number;
  timeout_seconds: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiSkill {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: AiSkillCategory;
  when_to_use?: string;
  target_objective?: string;
  main_instructions?: string;
  output_format: "json" | "markdown" | "text";
  output_schema: Record<string, any>;
  default_model_profile: string;
  status: AiSkillStatus;
  openai_skill_id?: string;
  openai_default_version?: string;
  openai_latest_version?: string;
  active_version_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed / Joined
  active_version?: AiSkillVersion;
  latest_execution?: AiExecution;
  total_executions?: number;
}

export interface AiSkillVersion {
  id: string;
  skill_id: string;
  version: number;
  openai_version?: string;
  bundle_path?: string;
  manifest_content: string;
  files: AiSkillFile[];
  changelog?: string;
  status: AiSkillStatus;
  created_by?: string;
  created_at: string;
  published_at?: string;
}

export interface AiExecution {
  id: string;
  company_id?: string;
  account_id?: string;
  user_id?: string;
  action: string;
  skill_id?: string;
  skill_slug: string;
  skill_version: number;
  openai_skill_id?: string;
  openai_version?: string;
  model_profile: string;
  model: string;
  input_summary: Record<string, any>;
  output: Record<string, any>;
  raw_response?: string;
  status: AiExecutionStatus;
  tokens_input: number;
  tokens_output: number;
  estimated_cost: number;
  latency_ms: number;
  error?: string;
  attempt: number;
  created_at: string;
}

export interface ContextPackage {
  company: {
    id?: string;
    name?: string;
    brand_manual?: Record<string, any>;
  };
  account: {
    id?: string;
    username?: string;
    network?: string;
    strategy?: Record<string, any>;
  };
  content_request: {
    format?: string;
    theme: string;
    objective?: string;
    angle?: string;
    cta?: string;
    custom_instruction?: string;
  };
  media_reference?: any;
}

export interface AiGenerationParams {
  action?: string;
  skillSlug?: string;
  skillId?: string;
  skillVersion?: number;
  companyId?: string;
  accountId?: string;
  contentId?: string;
  theme?: string;
  objective?: string;
  angle?: string;
  cta?: string;
  customInstruction?: string;
  format?: string;
  publicationType?: string;
  promptType?: string;
}

export interface AiExecutionResult<T = any> {
  success: boolean;
  result: string;
  structured_output?: T;
  execution_id?: string;
  skill: {
    id: string;
    slug: string;
    name: string;
    version: number;
  };
  model: string;
  model_profile: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  latency_ms: number;
  estimated_cost: number;
}
