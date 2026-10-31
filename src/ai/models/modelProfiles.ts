import { ModelProfile, ModelProfileCode } from "../schemas";

export const DEFAULT_MODEL_PROFILES: Record<ModelProfileCode, ModelProfile> = {
  CONTENT_STANDARD: {
    code: "CONTENT_STANDARD",
    name: "Content Standard (GPT-4o Mini)",
    description: "Modelo ultra-rápido e econômico para legendas, hooks, ideias e postagens rotineiras.",
    provider: "openai",
    model: "gpt-4o-mini",
    max_output_tokens: 2000,
    temperature: 0.7,
    timeout_seconds: 45,
    is_active: true,
  },
  CONTENT_ADVANCED: {
    code: "CONTENT_ADVANCED",
    name: "Content Advanced (GPT-4o)",
    description: "Modelo de alta precisão e nuance criativa para Reels profundos, carrosséis e roteirização complexa.",
    provider: "openai",
    model: "gpt-4o",
    max_output_tokens: 3000,
    temperature: 0.7,
    timeout_seconds: 60,
    is_active: true,
  },
  STRATEGY_ADVANCED: {
    code: "STRATEGY_ADVANCED",
    name: "Strategy Advanced (GPT-4o / Reasoning)",
    description: "Modelo com capacidade analítica aprofundada para planejamento editorial, campanhas e diagnóstico de marca.",
    provider: "openai",
    model: "gpt-4o",
    reasoning_effort: "medium",
    max_output_tokens: 4000,
    temperature: 0.5,
    timeout_seconds: 90,
    is_active: true,
  },
  FAST_CLASSIFIER: {
    code: "FAST_CLASSIFIER",
    name: "Fast Classifier (GPT-4o Mini)",
    description: "Classificador ultrarrápido para roteamento, extração de entidades e checagens lógicas.",
    provider: "openai",
    model: "gpt-4o-mini",
    max_output_tokens: 1000,
    temperature: 0.2,
    timeout_seconds: 20,
    is_active: true,
  },
};

export function getModelProfile(code: ModelProfileCode | string): ModelProfile {
  const profile = DEFAULT_MODEL_PROFILES[code as ModelProfileCode];
  if (!profile) {
    return DEFAULT_MODEL_PROFILES.CONTENT_STANDARD;
  }
  return profile;
}

export function estimateModelCost(model: string, inputTokens: number, outputTokens: number): number {
  let inCostPerM = 0.15;
  let outCostPerM = 0.6;

  const normalized = (model || "").toLowerCase();
  if (normalized.includes("gpt-4o") && !normalized.includes("mini")) {
    inCostPerM = 2.5;
    outCostPerM = 10.0;
  } else if (normalized.includes("o1") || normalized.includes("o3")) {
    inCostPerM = 1.1;
    outCostPerM = 4.4;
  }

  return (inputTokens * inCostPerM + outputTokens * outCostPerM) / 1_000_000;
}
