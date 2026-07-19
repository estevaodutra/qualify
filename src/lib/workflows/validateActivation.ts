import type { LocalNode, LocalConnection, RandomizerBranch } from "@/components/sequences/shared-types";
import { validateTrigger } from "@/components/sequences/triggers/TriggerValidation";
import { normalizeDelayConfig } from "./delay";

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

function validateDelayNodes(nodes: LocalNode[]): string[] {
  const errors: string[] = [];
  const validUnits = ["seconds", "minutes", "hours", "days"];

  for (const node of nodes) {
    if (node.nodeType === "delay") {
      const label = (node.config.label as string) || "Delay / Espera";
      const normalized = normalizeDelayConfig(node.config);

      if (normalized.value === undefined || normalized.value === null || isNaN(normalized.value)) {
        errors.push(`"${label}": Informe o tempo de espera.`);
      } else if (normalized.value <= 0) {
        errors.push(`"${label}": O delay precisa ser maior que zero.`);
      } else if (!validUnits.includes(normalized.unit)) {
        errors.push(`"${label}": Selecione uma unidade válida.`);
      } else if (normalized.delayMs > 30 * 24 * 60 * 60 * 1000) {
        errors.push(`"${label}": O delay máximo permitido é de 30 dias.`);
      } else if (normalized.delayMs < 1000) {
        errors.push(`"${label}": O delay mínimo permitido é de 1 segundo.`);
      }
    } else if (node.nodeType === "content") {
      const label = (node.config.label as string) || "Mensagem";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages = (node.config.messages as any[]) || [];
      for (const msg of messages) {
        if (msg.type === "delay") {
          const normalized = normalizeDelayConfig(msg);
          if (normalized.value === undefined || normalized.value === null || isNaN(normalized.value)) {
            errors.push(`"${label}" (Atraso de tempo): Informe o tempo de espera.`);
          } else if (normalized.value <= 0) {
            errors.push(`"${label}" (Atraso de tempo): O delay precisa ser maior que zero.`);
          } else if (!validUnits.includes(normalized.unit)) {
            errors.push(`"${label}" (Atraso de tempo): Selecione uma unidade válida.`);
          } else if (normalized.delayMs > 30 * 24 * 60 * 60 * 1000) {
            errors.push(`"${label}" (Atraso de tempo): O delay máximo permitido é de 30 dias.`);
          } else if (normalized.delayMs < 1000) {
            errors.push(`"${label}" (Atraso de tempo): O delay mínimo permitido é de 1 segundo.`);
          }
        }
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
    const triggers = (triggerNode.config.triggers as any[]) || [];
    
    // Support for legacy unmigrated nodes just in case
    const legacyType = triggerNode.config.triggerType as string | undefined;
    const legacyConfig = triggerNode.config.triggerConfig as Record<string, unknown> | undefined;

    if (triggers.length === 0 && !legacyType) {
      errors.push("Configure ao menos um evento no gatilho de Início.");
    } else if (triggers.length > 0) {
      triggers.forEach((t: any) => {
        const result = validateTrigger(t.type, t.config);
        if (!result.valid) errors.push(...result.errors);
      });
    } else if (legacyType) {
      const result = validateTrigger(legacyType, legacyConfig);
      if (!result.valid) errors.push(...result.errors);
    }

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
  errors.push(...validateDelayNodes(nodes));

  if (options.instanceConnected === false) {
    errors.push("A instância selecionada para esta automação não está conectada.");
  }

  return { valid: errors.length === 0, errors };
}
