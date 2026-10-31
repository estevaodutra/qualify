import { ChatOpenAI } from "@langchain/openai";
import { ModelProfile, ModelProfileCode } from "../schemas";
import { getModelProfile } from "./modelProfiles";

export interface ModelFactoryOptions {
  profileCode?: ModelProfileCode | string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
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
  });

  return client;
}
