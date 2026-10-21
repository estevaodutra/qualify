/**
 * Motor de Métricas e Indicadores do Sprint OS (Camada E).
 * Cálculos puros e determinísticos para:
 * - 3 Medidas de Progresso distintas (Tarefas, Esforço, Marcos)
 * - Missão Agora (Geral e por Responsável)
 * - Bússola Operacional (Diagnóstico de Gargalo com sustentação por dados)
 * - Rentabilidade da Empreitada (Fórmulas financeiras exatas da seção 33)
 */

import type {
  ID,
  LocalDateTime,
  Milestone,
  Priority,
  Sprint,
  Task,
  Workspace,
} from "../domain/types";
import { PRIORITY_RANK } from "../domain/types";
import { sprintTasks } from "../domain/ops";
import { businessDaysBetween, dateOf, nowInSaoPaulo, toMs, workMinutesBetween } from "../scheduler/time";
import { sprintCalendar } from "../scheduler/planning";

// ─────────────────────────────────────────────────────────────
// 1. MEDIDAS DE PROGRESSO (SEÇÃO 12)
// ─────────────────────────────────────────────────────────────

export interface ProgressMetrics {
  // 1. Por tarefas: concluídas / total
  tasksTotal: number;
  tasksDone: number;
  tasksDoing: number;
  tasksPending: number;
  tasksP0Open: number;
  taskProgressPct: number;

  // 2. Por esforço: esforço planejado das entregas concluídas / esforço planejado total
  effortTotalMinutes: number;
  effortDoneMinutes: number;
  effortRemainingMinutes: number;
  effortLoggedMinutes: number;
  effortProgressPct: number;

  // 3. Por marcos: marcos validados / marcos previstos
  milestonesTotal: number;
  milestonesDone: number;
  milestoneProgressPct: number;

  // Dias e Prazos
  businessDaysTotal: number;
  businessDaysRemaining: number;
  currentWorkDayIndex: number;
  blockedTasksCount: number;
  activeMembersCount: number;
}

export function computeProgressMetrics(ws: Workspace, sprintId: ID): ProgressMetrics {
  const sprint = ws.sprints[sprintId];
  const tasks = sprintTasks(ws, sprintId);
  const activeTasks = tasks.filter((t) => !t.archivedAt);

  const tasksTotal = activeTasks.length;
  const tasksDone = activeTasks.filter((t) => t.status === "done").length;
  const tasksDoing = activeTasks.filter((t) => t.status === "doing").length;
  const tasksPending = activeTasks.filter((t) => t.status === "pending").length;
  const tasksP0Open = activeTasks.filter((t) => t.status !== "done" && t.priority === "P0").length;
  const taskProgressPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  // Esforço
  let effortTotalMinutes = 0;
  let effortDoneMinutes = 0;
  let effortLoggedMinutes = 0;

  for (const t of activeTasks) {
    const planned = t.durationMinutes ?? 0;
    effortTotalMinutes += planned;

    const logged = t.timeEntries.reduce((sum, e) => sum + e.minutes, 0);
    effortLoggedMinutes += logged;

    if (t.status === "done") {
      effortDoneMinutes += planned;
    }
  }

  const effortRemainingMinutes = Math.max(0, effortTotalMinutes - effortDoneMinutes);
  const effortProgressPct =
    effortTotalMinutes > 0 ? Math.round((effortDoneMinutes / effortTotalMinutes) * 100) : 0;

  // Marcos
  const milestones = Object.values(ws.milestones).filter(
    (m) => m.sprintId === sprintId && !m.archivedAt
  );
  const milestonesTotal = milestones.length;
  const milestonesDone = milestones.filter((m) => !!m.validatedAt).length;
  const milestoneProgressPct =
    milestonesTotal > 0 ? Math.round((milestonesDone / milestonesTotal) * 100) : 0;

  // Calendário / Dias úteis
  const cal = sprint ? sprintCalendar(ws, sprint) : Object.values(ws.calendars)[0];
  const now = nowInSaoPaulo();
  const nowDate = dateOf(now);

  const businessDaysTotal = sprint?.businessDays ?? 10;
  let businessDaysRemaining = businessDaysTotal;
  let currentWorkDayIndex = 1;

  if (sprint?.startDate) {
    if (nowDate >= sprint.startDate) {
      const elapsed = businessDaysBetween(cal, sprint.startDate, nowDate);
      currentWorkDayIndex = Math.max(1, elapsed);
      businessDaysRemaining = Math.max(0, businessDaysTotal - elapsed);
    }
  }

  const blockedTasksCount = activeTasks.filter((t) => !!t.blockedReason).length;
  const activeMembersSet = new Set(activeTasks.map((t) => t.assigneeId).filter(Boolean));

  return {
    tasksTotal,
    tasksDone,
    tasksDoing,
    tasksPending,
    tasksP0Open,
    taskProgressPct,
    effortTotalMinutes,
    effortDoneMinutes,
    effortRemainingMinutes,
    effortLoggedMinutes,
    effortProgressPct,
    milestonesTotal,
    milestonesDone,
    milestoneProgressPct,
    businessDaysTotal,
    businessDaysRemaining,
    currentWorkDayIndex,
    blockedTasksCount,
    activeMembersCount: activeMembersSet.size,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. MISSÃO AGORA (SEÇÃO 22)
// ─────────────────────────────────────────────────────────────

export interface MissionNow {
  task: Task | null;
  stageTitle: string;
  assigneeName: string;
  nextAction: string;
  subtasksDone: number;
  subtasksTotal: number;
  blockReason: string | null;
  unblockingAction: string | null;
}

export function computeMissionNow(
  ws: Workspace,
  sprintId: ID,
  filterAssigneeId?: ID | null
): MissionNow {
  const tasks = sprintTasks(ws, sprintId).filter((t) => !t.archivedAt);
  const activeTaskIds = new Set(tasks.map((t) => t.id));

  // Mapa de dependências
  const deps = Object.values(ws.dependencies).filter(
    (d) => activeTaskIds.has(d.predecessorId) && activeTaskIds.has(d.successorId)
  );
  const predsMap = new Map<ID, ID[]>();
  deps.forEach((d) => {
    const list = predsMap.get(d.successorId) || [];
    list.push(d.predecessorId);
    predsMap.set(d.successorId, list);
  });

  const byId = new Map(tasks.map((t) => [t.id, t]));

  // Filtrar elegíveis:
  // 1. Não concluídas
  // 2. Sem impedimento/bloqueio ativo
  // 3. Dependências concluídas
  // 4. Se filtrado por responsável, corresponder
  const eligible = tasks.filter((t) => {
    if (t.status === "done") return false;
    if (t.blockedReason) return false;
    if (filterAssigneeId && t.assigneeId !== filterAssigneeId) return false;

    const preds = predsMap.get(t.id) || [];
    const allPredsDone = preds.every((pId) => byId.get(pId)?.status === "done");
    return allPredsDone;
  });

  // Se não houver atividade executável, identificar o bloqueio principal
  if (eligible.length === 0) {
    const blockedTask = tasks.find((t) => t.status !== "done" && t.blockedReason);
    if (blockedTask) {
      return {
        task: null,
        stageTitle: ws.stages[blockedTask.stageId]?.title || "",
        assigneeName: blockedTask.assigneeId ? ws.members[blockedTask.assigneeId]?.name || "Responsável" : "Sem atribuição",
        nextAction: "Desbloquear impedimento operacional",
        subtasksDone: 0,
        subtasksTotal: 0,
        blockReason: `Tarefa "${blockedTask.title}" travada: ${blockedTask.blockedReason}`,
        unblockingAction: "Revisar bloqueio e notificar o validador/responsável",
      };
    }

    const waitingDep = tasks.find((t) => {
      if (t.status === "done") return false;
      const preds = predsMap.get(t.id) || [];
      return preds.some((pId) => byId.get(pId)?.status !== "done");
    });

    if (waitingDep) {
      const pendingPredId = (predsMap.get(waitingDep.id) || []).find(
        (pId) => byId.get(pId)?.status !== "done"
      );
      const predTask = pendingPredId ? byId.get(pendingPredId) : null;
      return {
        task: null,
        stageTitle: ws.stages[waitingDep.stageId]?.title || "",
        assigneeName: waitingDep.assigneeId ? ws.members[waitingDep.assigneeId]?.name || "Responsável" : "Sem atribuição",
        nextAction: `Aguardando conclusão de "${predTask?.title || "dependência anterior"}"`,
        subtasksDone: 0,
        subtasksTotal: 0,
        blockReason: `Fluxo em espera de dependência direta`,
        unblockingAction: `Priorizar a finalização de "${predTask?.title || "tarefa predecessora"}"`,
      };
    }

    return {
      task: null,
      stageTitle: "Implementação Concluída ou Sem Tarefas Pendentes",
      assigneeName: "—",
      nextAction: "Nenhuma pendência imediata.",
      subtasksDone: 0,
      subtasksTotal: 0,
      blockReason: null,
      unblockingAction: null,
    };
  }

  // Ordenação de prioridade da Missão Agora:
  // 1. Em execução (doing) primeiro
  // 2. Prioridade P0 > P1 > P2 > P3
  // 3. Impacto Financeiro (true > false)
  // 4. Prazo de início mais próximo
  eligible.sort((a, b) => {
    if (a.status === "doing" && b.status !== "doing") return -1;
    if (b.status === "doing" && a.status !== "doing") return 1;

    const prA = PRIORITY_RANK[a.priority];
    const prB = PRIORITY_RANK[b.priority];
    if (prA !== prB) return prA - prB;

    if (a.financialImpact !== b.financialImpact) {
      return a.financialImpact ? -1 : 1;
    }

    const startA = a.plannedStart ? toMs(a.plannedStart) : Infinity;
    const startB = b.plannedStart ? toMs(b.plannedStart) : Infinity;
    return startA - startB;
  });

  const bestTask = eligible[0];
  const stage = ws.stages[bestTask.stageId];
  const assignee = bestTask.assigneeId ? ws.members[bestTask.assigneeId] : null;

  const subtasks = Object.values(ws.subtasks).filter(
    (s) => s.taskId === bestTask.id && !s.archivedAt
  );
  const subtasksTotal = subtasks.length;
  const subtasksDone = subtasks.filter((s) => s.done).length;

  const pendingSubtask = subtasks.find((s) => !s.done);
  const nextAction = pendingSubtask
    ? pendingSubtask.title
    : bestTask.description || "Executar checklist da tarefa";

  return {
    task: bestTask,
    stageTitle: stage?.title || "Etapa Operacional",
    assigneeName: assignee?.name || "Sem responsável atribuído",
    nextAction,
    subtasksDone,
    subtasksTotal,
    blockReason: null,
    unblockingAction: null,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. BÚSSOLA OPERACIONAL (MOTOR DE GARGALOS - SEÇÃO 28)
// ─────────────────────────────────────────────────────────────

export type BottleneckDiagnostic =
  | "ESTRUTURAR"
  | "INTEGRAR"
  | "ATIVAR"
  | "ATENDER"
  | "MEDIR"
  | "OTIMIZAR"
  | "ENTREGAR";

export interface CompassResult {
  diagnostic: BottleneckDiagnostic;
  headline: string;
  rationale: string;
  supportingData: string;
  actionRecommendation: string;
}

export function computeOperationalCompass(ws: Workspace, sprintId: ID): CompassResult {
  const tasks = sprintTasks(ws, sprintId).filter((t) => !t.archivedAt);
  const byTitle = (query: string) =>
    tasks.find((t) => t.title.toLowerCase().includes(query.toLowerCase()));

  // 1. ESTRUTURAR: falta CRM, pipeline, acessos básicos
  const accessTask = byTitle("acessos");
  const crmTask = byTitle("crm");
  const pipeTask = byTitle("pipeline");

  if ((accessTask && accessTask.status !== "done") || (crmTask && crmTask.status !== "done")) {
    return {
      diagnostic: "ESTRUTURAR",
      headline: "Falta fundação básica da operação",
      rationale: "O ambiente de CRM ou acessos essenciais ainda não foram homologados.",
      supportingData: `CRM: ${crmTask?.status ?? "pendente"} · Acessos: ${accessTask?.status ?? "pendente"}`,
      actionRecommendation: "Concluir a configuração inicial do workspace e credenciais.",
    };
  }

  // 2. INTEGRAR: automações, integrações de formulário/webhook
  const autoTask = byTitle("automação") || byTitle("entrada de leads") || byTitle("mensagens automáticas");
  if (autoTask && autoTask.status !== "done") {
    return {
      diagnostic: "INTEGRAR",
      headline: "Estruturas isoladas aguardando conexão",
      rationale: "Canais e fluxos de mensagens ainda não estão interligados ao CRM.",
      supportingData: `Automação de leads: ${autoTask.status} (${autoTask.title})`,
      actionRecommendation: "Testar o webhook e a distribuição automática de contatos.",
    };
  }

  // 3. ATIVAR: campanhas, anúncios, tráfego
  const adsTask = byTitle("post ad") || byTitle("meta ads") || byTitle("publicar");
  if (adsTask && adsTask.status !== "done") {
    return {
      diagnostic: "ATIVAR",
      headline: "Estrutura pronta, mas sem tração de demanda",
      rationale: "A máquina comercial está configurada, porém as campanhas de aquisição não foram disparadas.",
      supportingData: `Anúncios / Tráfego: ${adsTask.status} (${adsTask.title})`,
      actionRecommendation: "Publicar os criativos aprovados e confirmar início de veiculação.",
    };
  }

  // 4. ATENDER: leads chegando mas SDR travado ou não atendendo
  const sdrTask = byTitle("sdr") || byTitle("atendimento");
  const funnelLeads = Object.values(ws.funnel).reduce((sum, f) => sum + f.count, 0);

  if (sdrTask && sdrTask.status !== "done") {
    return {
      diagnostic: "ATENDER",
      headline: "Gargalo no atendimento comercial",
      rationale: "O fluxo de SDR ainda não está ativo ou não foi devidamente treinado.",
      supportingData: `SDR: ${sdrTask.status} · Contatos no Funil: ${funnelLeads}`,
      actionRecommendation: "Validar o acesso do operador e alinhar o roteiro de abordagem comercial.",
    };
  }

  // 5. MEDIR: campanhas rodando mas dashboard/métricas não acompanhadas
  const dashTask = byTitle("dashboard") || byTitle("indicadores") || byTitle("métricas");
  if (dashTask && dashTask.status !== "done") {
    return {
      diagnostic: "MEDIR",
      headline: "Operação rodando sem telemetria confiável",
      rationale: "Faltam métricas unificadas de conversão, CPL e agendamentos.",
      supportingData: `Telemetria / Métricas: ${dashTask.status}`,
      actionRecommendation: "Consolidar o painel diário de acompanhamento de resultados.",
    };
  }

  // 6. OTIMIZAR: tudo rodando, pendente auditoria e ajustes finos
  const optTask = byTitle("otimização") || byTitle("auditar") || byTitle("revisar");
  if (optTask && optTask.status !== "done") {
    return {
      diagnostic: "OTIMIZAR",
      headline: "Fase de refinamento e testes de taxa",
      rationale: "Dados operacionais suficientes para realizar ajustes em anúncios e script.",
      supportingData: `Auditoria de conversas/anúncios em aberto`,
      actionRecommendation: "Realizar o feedback executivo com ajustes de copy e targeting.",
    };
  }

  // 7. ENTREGAR: encerramento, auditoria final, playbook
  return {
    diagnostic: "ENTREGAR",
    headline: "Pronto para formalização e handoff",
    rationale: "Todos os entregáveis técnicos foram implementados e homologados.",
    supportingData: `${tasks.filter((t) => t.status === "done").length}/${tasks.length} entregas concluídas`,
    actionRecommendation: "Emitir relatório final e colher termo de aceite com o cliente.",
  };
}

// ─────────────────────────────────────────────────────────────
// 4. RENTABILIDADE DA EMPREITADA (SEÇÃO 33)
// ─────────────────────────────────────────────────────────────

export interface FinancialSummary {
  contractValue: number;
  revenueReceived: number;
  plannedCost: number;
  actualCost: number;
  projectedRemainingCost: number;
  projectedFinalCost: number;
  projectedGrossProfit: number;
  projectedGrossMarginPct: number;
  costVariance: number;
  reworkCost: number;
  clientMediaSpent: number;
  plannedHours: number;
  actualHours: number;
}

export function computeSprintFinancials(ws: Workspace, sprintId: ID): FinancialSummary {
  const sprint = ws.sprints[sprintId];
  const contractValue = sprint?.contractValue ?? 0;
  const revenueReceived = sprint?.revenueReceived ?? 0;

  const tasks = sprintTasks(ws, sprintId).filter((t) => !t.archivedAt);

  let plannedHours = 0;
  let actualHours = 0;
  let plannedCost = 0;
  let actualCost = 0;
  let projectedRemainingCost = 0;

  for (const t of tasks) {
    const plannedMins = t.durationMinutes ?? 0;
    plannedHours += plannedMins / 60;

    const loggedMins = t.timeEntries.reduce((sum, e) => sum + e.minutes, 0);
    actualHours += loggedMins / 60;

    const rate = (t.assigneeId && ws.costs[t.assigneeId]) ?? 0;

    // Custo planejado da tarefa
    plannedCost += (plannedMins / 60) * rate;

    // Custo realizado com base no tempo gasto
    actualCost += (loggedMins / 60) * rate;

    // Esforço restante previsto
    if (t.status !== "done") {
      const remMins = Math.max(0, plannedMins - loggedMins);
      projectedRemainingCost += (remMins / 60) * rate;
    }
  }

  // Despesas registradas
  const records = Object.values(ws.financialRecords).filter(
    (r) => r.sprintId === sprintId && !r.archivedAt
  );

  let reworkCost = 0;
  let clientMediaSpent = 0;

  for (const r of records) {
    if (r.category === "client_media") {
      // Mídia paga pelo cliente não entra no custo da empreitada
      clientMediaSpent += r.amount;
      continue;
    }

    if (r.category === "rework") {
      reworkCost += r.amount;
    }

    if (r.kind === "planned") {
      plannedCost += r.amount;
    } else {
      actualCost += r.amount;
    }
  }

  const projectedFinalCost = actualCost + projectedRemainingCost;
  const projectedGrossProfit = contractValue - projectedFinalCost;
  const projectedGrossMarginPct =
    contractValue > 0 ? Math.round((projectedGrossProfit / contractValue) * 100) : 0;
  const costVariance = projectedFinalCost - plannedCost;

  return {
    contractValue,
    revenueReceived,
    plannedCost: Math.round(plannedCost),
    actualCost: Math.round(actualCost),
    projectedRemainingCost: Math.round(projectedRemainingCost),
    projectedFinalCost: Math.round(projectedFinalCost),
    projectedGrossProfit: Math.round(projectedGrossProfit),
    projectedGrossMarginPct,
    costVariance: Math.round(costVariance),
    reworkCost: Math.round(reworkCost),
    clientMediaSpent: Math.round(clientMediaSpent),
    plannedHours: Number(plannedHours.toFixed(1)),
    actualHours: Number(actualHours.toFixed(1)),
  };
}
