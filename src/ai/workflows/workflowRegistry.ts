import { WorkflowDefinition } from "../schemas";

/**
 * Catálogo de Workflows LangGraph da Central de IA.
 * Zerado para reconstrução individual e modular.
 */
export const WorkflowRegistry: Record<string, WorkflowDefinition> = {};

export function registerWorkflow(workflow: WorkflowDefinition): void {
  WorkflowRegistry[workflow.slug] = workflow;
}

export function getWorkflow(slug: string): WorkflowDefinition | undefined {
  return WorkflowRegistry[slug];
}

export function listWorkflows(): WorkflowDefinition[] {
  return Object.values(WorkflowRegistry);
}
