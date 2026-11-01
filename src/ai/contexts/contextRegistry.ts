import { ContextProviderDefinition } from "../schemas";

/**
 * Registro Central de Provedores de Contexto.
 * Zerado para reconstrução individual e modular.
 */
export const ContextProviderRegistry: Record<string, ContextProviderDefinition> = {};

export function registerContextProvider(provider: ContextProviderDefinition): void {
  ContextProviderRegistry[provider.slug] = provider;
}

export function getContextProvider(slug: string): ContextProviderDefinition | undefined {
  return ContextProviderRegistry[slug];
}

export function listContextProviders(): ContextProviderDefinition[] {
  return Object.values(ContextProviderRegistry);
}

/**
 * Resolve apenas os providers solicitados pelo Agente/Workflow.
 */
export async function resolveContextForAgent(
  providerSlugs: string[],
  params: {
    company_id: string;
    account_id?: string;
    user_id?: string;
    lead_id?: string;
    campaign_id?: string;
  }
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  for (const slug of providerSlugs) {
    const provider = ContextProviderRegistry[slug];
    if (provider) {
      try {
        result[slug] = await provider.resolve(params);
      } catch (err: any) {
        result[slug] = { error: err?.message || "Failed to resolve context" };
      }
    }
  }

  return result;
}
