export interface VariableContext {
  lead?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    custom_fields?: Record<string, any> | null;
  } | null;
  deal?: {
    title?: string | null;
    value?: number | string | null;
    checkout_url?: string | null;
    proposal_url?: string | null;
    [key: string]: any;
  } | null;
  company?: {
    name?: string | null;
    [key: string]: any;
  } | null;
  operator?: {
    name?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
}

/**
 * Resolves template variables formatted like {{lead.name}}, {{lead.custom_fields.chave}}, {{deal.value}}, etc.
 * If a variable value is not found in context, it remains intact in the text.
 */
export function resolveVariables(templateText: string, context?: VariableContext): string {
  if (!templateText) return "";
  if (!context) return templateText;

  return templateText.replace(/\{\{\s*([\w\.-]+)\s*\}\}/g, (match, path: string) => {
    const parts = path.split('.');
    let current: any = context;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback check for operator.name / operator.full_name
        if (path === 'operator.name' && context.operator?.full_name) {
          return context.operator.full_name;
        }
        return match; // Return unchanged variable if path not found
      }
    }

    if (current !== undefined && current !== null && typeof current !== 'object') {
      return String(current);
    }

    return match;
  });
}
