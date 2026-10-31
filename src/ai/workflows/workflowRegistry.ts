import { WorkflowDefinition } from "../schemas";
import { buildStrategicReelGraph } from "./create_strategic_reel/graph";

export const strategicReelWorkflowDefinition: WorkflowDefinition = {
  slug: "create_strategic_reel",
  name: "Criar Reel Estratégico",
  description:
    "Workflow LangGraph ponta a ponta: Carrega contexto -> Gera 3 ganchos -> Pontua com score_hook -> Seleciona vencedor -> Escreve roteiro -> Gera Beat Sheet -> Valida com loop guard -> Salva conteúdo.",
  version: 1,
  loop_guards: {
    max_agent_steps: 10,
    max_tool_calls: 20,
    max_retries: 3,
    max_execution_time_seconds: 120,
    max_cost_dollars: 2.0,
  },
  createGraph: (options) => buildStrategicReelGraph(options),
};

export const WorkflowRegistry: Record<string, WorkflowDefinition> = {
  create_strategic_reel: strategicReelWorkflowDefinition,
};

export function registerWorkflow(workflow: WorkflowDefinition): void {
  WorkflowRegistry[workflow.slug] = workflow;
}

export function getWorkflow(slug: string): WorkflowDefinition | undefined {
  return WorkflowRegistry[slug];
}

export function listWorkflows(): WorkflowDefinition[] {
  return Object.values(WorkflowRegistry);
}
