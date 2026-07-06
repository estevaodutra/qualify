import { getTriggerDefinition } from "./triggerDefinitions";

export interface TriggerValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTrigger(
  triggerType: string | undefined,
  triggerConfig: Record<string, unknown> | undefined
): TriggerValidationResult {
  if (!triggerType) {
    return { valid: false, errors: ["Configure o gatilho antes de ativar."] };
  }
  const definition = getTriggerDefinition(triggerType);
  if (!definition) {
    return { valid: false, errors: [`Tipo de gatilho desconhecido: ${triggerType}`] };
  }
  if (definition.status !== "available") {
    return { valid: false, errors: [`O gatilho "${definition.label}" ainda não está disponível ("Em breve").`] };
  }
  const errors = definition.validate(triggerConfig || {});
  return { valid: errors.length === 0, errors };
}
