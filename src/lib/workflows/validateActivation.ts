import type { LocalNode, LocalConnection, RandomizerBranch } from "@/components/sequences/shared-types";
import { validateTrigger } from "@/components/sequences/triggers/TriggerValidation";

export interface ActivationValidationResult {
  valid: boolean;
  errors: string[];
}

interface ValidateActivationOptions {
  /** Whether the automation's configured instance is currently connected.
   * Pass `undefined` to skip this check (e.g. automations with no channel
   * dependency yet). */
  instanceConnected?: boolean;
}

const TRIGGER_NODE_TYPE = "trigger";

function hasCycle(nodes: LocalNode[], connections: LocalConnection[]): boolean {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const conn of connections) {
    adjacency.get(conn.sourceNodeId)?.push(conn.targetNodeId);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(nodes.map((n) => [n.id, WHITE]));

  const visit = (nodeId: string): boolean => {
    color.set(nodeId, GRAY);
    for (const nextId of adjacency.get(nodeId) || []) {
      const c = color.get(nextId);
      if (c === GRAY) return true; // back edge -> cycle
      if (c === WHITE && visit(nextId)) return true;
    }
    color.set(nodeId, BLACK);
    return false;
  };

  for (const node of nodes) {
    if (color.get(node.id) === WHITE && visit(node.id)) return true;
  }
  return false;
}

function validateRandomizerNodes(nodes: LocalNode[]): string[] {
  const errors: string[] = [];
  for (const node of nodes.filter((n) => n.nodeType === "randomizer")) {
    const mode = (node.config.mode as string) || "weighted_random";
    const branches = (node.config.branches as RandomizerBranch[]) || [];
    const label = (node.config.label as string) || "Randomizador";

    if (branches.length < 2) errors.push(`"${label}": precisa de pelo menos 2 ramificações.`);
    if (branches.length > 10) errors.push(`"${label}": no máximo 10 ramificações são permitidas.`);

    if (mode === "weighted_random" && branches.length >= 2) {
      const total = branches.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
      if (total !== 100) {
        errors.push(`"${label}": os percentuais precisam totalizar 100% (atualmente ${total}%).`);
      }
    }
  }
  return errors;
}

export function validateWorkflowActivation(
  nodes: LocalNode[],
  connections: LocalConnection[],
  options: ValidateActivationOptions = {}
): ActivationValidationResult {
  const errors: string[] = [];

  const triggerNode = nodes.find((n) => n.nodeType === TRIGGER_NODE_TYPE);
  if (!triggerNode) {
    errors.push("Esta automação não possui um gatilho (Início).");
  } else {
    const triggerType = triggerNode.config.triggerType as string | undefined;
    const triggerConfig = triggerNode.config.triggerConfig as Record<string, unknown> | undefined;
    const triggerResult = validateTrigger(triggerType, triggerConfig);
    if (!triggerResult.valid) errors.push(...triggerResult.errors);

    const hasOutgoing = connections.some((c) => c.sourceNodeId === triggerNode.id);
    if (!hasOutgoing && nodes.length > 1) {
      errors.push("O gatilho (Início) precisa estar conectado a um próximo bloco.");
    }
  }

  // Connections must reference nodes that actually exist.
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const conn of connections) {
    if (!nodeIds.has(conn.sourceNodeId) || !nodeIds.has(conn.targetNodeId)) {
      errors.push("Existem conexões apontando para blocos que não existem mais.");
      break;
    }
  }

  // Removed: We no longer prevent activation if there are isolated nodes,
  // allowing users to keep disconnected blocks in the workflow as "drafts".

  if (hasCycle(nodes, connections)) {
    errors.push("O fluxo contém um ciclo inválido entre blocos.");
  }

  errors.push(...validateRandomizerNodes(nodes));

  if (options.instanceConnected === false) {
    errors.push("A instância selecionada para esta automação não está conectada.");
  }

  return { valid: errors.length === 0, errors };
}
