import { ChatOpenAI } from "@langchain/openai";
import { ModelProfile, ModelProfileCode } from "../schemas";
import { getModelProfile } from "./modelProfiles";
import { supabase } from "@/integrations/supabase/client";

export interface ModelFactoryOptions {
  profileCode?: ModelProfileCode | string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/**
 * Resolve a API Key da OpenAI na seguinte ordem de prioridade:
 * 1. Chave explicitamente informada (options / playground)
 * 2. Supabase platform_settings (salva pelo Super Admin em IA > Configurações)
 * 3. Variáveis de ambiente (import.meta.env ou process.env)
 */
export async function resolveOpenAiApiKey(providedKey?: string): Promise<string> {
  if (providedKey && providedKey.trim().length > 10) {
    return providedKey.trim();
  }

  // 1. Tentar ler do Supabase platform_settings (onde o Super Admin salva)
  try {
    const { data } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", "openai_config")
      .maybeSingle();

    if (data?.value?.api_key && String(data.value.api_key).trim().length > 10) {
      return String(data.value.api_key).trim();
    }
  } catch (err) {
    console.warn("[resolveOpenAiApiKey] Não foi possível ler de platform_settings:", err);
  }

  // 2. Tentar variáveis de ambiente do frontend/backend
  if (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_OPENAI_API_KEY) {
    return (import.meta as any).env.VITE_OPENAI_API_KEY;
  }
  if (typeof process !== "undefined" && process.env?.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  return "";
}

export function createLangChainChatModel(options: ModelFactoryOptions = {}): ChatOpenAI {
  const profile: ModelProfile = getModelProfile(options.profileCode || "CONTENT_STANDARD");

  const apiKey =
    options.apiKey ||
    (typeof process !== "undefined" && process.env?.OPENAI_API_KEY) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_OPENAI_API_KEY) ||
    "dummy-api-key-for-initialization";

  const client = new ChatOpenAI({
    model: profile.model,
    temperature: options.temperature ?? profile.temperature,
    maxTokens: options.maxTokens ?? profile.max_output_tokens,
    timeout: options.timeoutMs ?? profile.timeout_seconds * 1000,
    openAIApiKey: apiKey,
    configuration: {
      dangerouslyAllowBrowser: true,
    },
  });

  return client;
}
