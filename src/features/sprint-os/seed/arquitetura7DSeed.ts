/**
 * Template Oficial: "IMPLEMENTAÇÃO 7D — ARQUITETURA DE RECEITA"
 * Especificação: PATCH 002 — Otimização da Dashboard com Arquitetura 7D V2.0
 *
 * Estrutura:
 * - Ciclos e Etapas com classificação de origem (DEFINIDO, DERIVADO, PROPOSTO)
 * - Critérios verificáveis de conclusão por tarefa
 * - Materiais entregáveis com versionamento e aprovação
 * - Bloqueios operacionais estruturados
 * - Backup Master referenciado
 * - Demandas do expert identificadas
 */

import type {
  Project,
  Sprint,
  Stage,
  Task,
  Subtask,
  Workspace,
  Milestone,
  RoutineDefinition,
  FunnelStage,
} from "../domain/types";
import { makeCalendar } from "../domain/ops";

export function createArquitetura7DSeed(actorName = "Engenharia 7D"): Workspace {
  const nowIso = "2026-10-21T09:00:00.000Z";
  const ctx = { actorName, nowIso };

  const defaultCalendar = makeCalendar(ctx, {
    name: "Jornada 7D Operacional",
    workStart: "09:00",
    workEnd: "18:00",
    breaks: [{ start: "12:00", end: "13:00" }],
    workDays: [1, 2, 3, 4, 5],
    holidays: ["2026-11-02", "2026-11-15", "2026-12-25"],
  });

  const project: Project = {
    id: "proj-arquitetura-7d",
    name: "Implementação 7D",
    client: "Operação Comercial",
    description: "Estrutura operacional baseada no Playbook da Arquitetura 7D: infraestrutura, aquisição, conteúdo, conversão X1 e governança de entregáveis.",
    contractModel: "Arquitetura 7D — Implementação Completa",
    timezone: "America/Sao_Paulo",
    createdAt: nowIso,
    updatedAt: nowIso,
    archivedAt: null,
    rev: 1,
  };

  const sprint: Sprint = {
    id: "sprint-7d-01",
    projectId: project.id,
    name: "Ciclo 7D — Ativação e Receita",
    objective: "Implementar a infraestrutura técnica, tráfego de aquisição, distribuição orgânica, funil comercial X1 e esteira de entregáveis auditáveis.",
    deliverables: [
      "Infraestrutura e acessos validados",
      "Campanhas de aquisição 7D ativas",
      "Rotina de distribuição de conteúdo configurada",
      "Funil comercial X1 operando",
      "Demandas do expert organizadas",
      "Critérios de conclusão e backups validados",
    ],
    position: 0,
    startDate: "2026-10-21",
    startTime: "09:00",
    businessDays: 10,
    calendarId: defaultCalendar.id,
    managerId: null,
    contractValue: 5000,
    revenueReceived: 5000,
    schedulingMode: "hybrid",
    activatedAt: null,
    baseline: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    archivedAt: null,
    rev: 1,
  };

  // Etapas Canônicas 7D
  const stagesDefs = [
    {
      title: "CICLO 1 — FUNDAÇÃO, ACESSOS & INFRAESTRUTURA",
      tasks: [
        {
          title: "Auditoria de Acessos, BM e Contas de Anúncios",
          origin: "defined" as const,
          priority: "P0" as const,
          impactFlags: ["infrastructure" as const],
          durationMinutes: 120,
          criteria: [
            { text: "Acesso de administrador ao Gerenciador de Negócios confirmado", required: true },
            { text: "Pixel Meta e API de Conversões verificados", required: true },
            { text: "Forma de pagamento cadastrada e sem restrições", required: true },
          ],
          deliverables: [
            { name: "Checklist de Infraestrutura Técnica", type: "Documento", version: "v1.0" },
          ],
        },
        {
          title: "Configuração do WhatsApp Business & Integrações",
          origin: "defined" as const,
          priority: "P0" as const,
          impactFlags: ["operational" as const, "infrastructure" as const],
          durationMinutes: 90,
          criteria: [
            { text: "Número oficial conectado à ferramenta de atendimento", required: true },
            { text: "Mensagens rápidas e gatilhos de saudação ativos", required: true },
          ],
        },
      ],
    },
    {
      title: "CICLO 2 — MÁQUINA DE AQUISIÇÃO & TRÁFEGO 7D",
      tasks: [
        {
          title: "Estruturação das Campanhas de Entrada no Grupo & Direct",
          origin: "defined" as const,
          priority: "P0" as const,
          impactFlags: ["financial_high" as const, "schedule_impact" as const],
          durationMinutes: 180,
          criteria: [
            { text: "Públicos de teste e lookalike configurados", required: true },
            { text: "Links rastreados com UTM parametrizados", required: true },
            { text: "Verificação de orçamento diário aprovado", required: true },
          ],
          deliverables: [
            { name: "Setup de Campanhas Meta Ads", type: "Campanha", version: "v1.0" },
          ],
        },
        {
          title: "Demanda do Expert: Gravação de Criativos de Ativação",
          origin: "derived" as const,
          priority: "P1" as const,
          impactFlags: ["schedule_impact" as const],
          durationMinutes: 120,
          expertDemand: {
            isExpertDemand: true,
            category: "gravar" as const,
            status: "solicitado" as const,
            requesterName: "Gestor de Tráfego",
            quantity: 3,
            agreedDeadline: "2026-10-24",
            expectedMaterial: "3 vídeos curtos no formato 9:16 (gancho + CTA)",
          },
          criteria: [
            { text: "Vídeos brutos gravados conforme o roteiro aprovado", required: true },
            { text: "Subida dos arquivos brutos na pasta de Backup Master", required: true },
          ],
        },
      ],
    },
    {
      title: "CICLO 3 — CONTEÚDO & DISTRIBUIÇÃO EM MASSA",
      tasks: [
        {
          title: "Planejamento e Linha Editorial de Distribuição Orgânica",
          origin: "derived" as const,
          priority: "P1" as const,
          impactFlags: ["operational" as const],
          durationMinutes: 150,
          criteria: [
            { text: "Meta diária de visualizações definida (faixa 1k-10k)", required: true },
            { text: "Calendário semanal com temas de Reels preenchido", required: true },
          ],
          deliverables: [
            { name: "Grade de Conteúdo & Roteiros de Reels", type: "Roteiro", version: "v1.0" },
          ],
        },
        {
          title: "Edição e Versionamento dos Criativos de Alta Conversão",
          origin: "derived" as const,
          priority: "P1" as const,
          impactFlags: ["operational" as const],
          durationMinutes: 180,
          criteria: [
            { text: "Legendas e cortes dinâmicos finalizados", required: true },
            { text: "Aprovação registrada pelo estrategista", required: true },
            { text: "Backup da versão final salva no Drive", required: true },
          ],
        },
      ],
    },
    {
      title: "CICLO 4 — MÁQUINA DE CONVERSÃO COMERCIAL X1",
      tasks: [
        {
          title: "Playbook e Script de Qualificação & Fechamento X1",
          origin: "defined" as const,
          priority: "P0" as const,
          impactFlags: ["financial_high" as const],
          durationMinutes: 120,
          criteria: [
            { text: "Roteiro de triagem e quebra de objeções validado", required: true },
            { text: "Simulação de atendimento com operador realizada", required: true },
          ],
          deliverables: [
            { name: "Script Comercial 7D - Qualificação e Vendas", type: "Playbook", version: "v1.0" },
          ],
        },
        {
          title: "Estruturação das Etapas do Funil no CRM",
          origin: "defined" as const,
          priority: "P1" as const,
          impactFlags: ["operational" as const],
          durationMinutes: 90,
          criteria: [
            { text: "Etapas correspondentes ao Funil X1 cadastradas", required: true },
            { text: "Campos personalizados de qualificação criados", required: true },
          ],
        },
      ],
    },
    {
      title: "CICLO 5 — OTIMIZAÇÕES & PROPOSTAS DE ESCALA",
      tasks: [
        {
          title: "Proposta: Teste A/B de Gancho para Tráfego Direto",
          origin: "proposed" as const,
          priority: "P2" as const,
          impactFlags: ["financial_low" as const],
          durationMinutes: 60,
          criteria: [
            { text: "Aprovação prévia do cliente para verba adicional", required: true },
          ],
        },
        {
          title: "Proposta: Automação Avançada de Recuperação de Boletos",
          origin: "proposed" as const,
          priority: "P3" as const,
          impactFlags: ["financial_low" as const],
          durationMinutes: 90,
          criteria: [
            { text: "Validação do gateway de pagamento", required: true },
          ],
        },
      ],
    },
  ];

  const stages: Record<string, Stage> = {};
  const tasks: Record<string, Task> = {};
  const subtasks: Record<string, Subtask> = {};

  let globalTaskIndex = 0;

  stagesDefs.forEach((stgDef, stageIdx) => {
    const stageId = `stg-7d-${stageIdx + 1}`;
    stages[stageId] = {
      id: stageId,
      sprintId: sprint.id,
      title: stgDef.title,
      position: stageIdx,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    };

    stgDef.tasks.forEach((tDef) => {
      globalTaskIndex += 1;
      const taskId = `task-7d-${globalTaskIndex}`;

      const completionCriteria = (tDef.criteria || []).map((c, cIdx) => ({
        id: `crit-${taskId}-${cIdx + 1}`,
        text: c.text,
        done: false,
        required: c.required,
      }));

      const deliverableMaterials = (tDef.deliverables || []).map((d, dIdx) => ({
        id: `deliv-${taskId}-${dIdx + 1}`,
        name: d.name,
        type: d.type,
        version: d.version,
        url: "",
        reviewStatus: "nao_enviado" as const,
        updatedAt: nowIso,
      }));

      tasks[taskId] = {
        id: taskId,
        stageId,
        title: tDef.title,
        description: "",
        position: globalTaskIndex - 1,
        priority: tDef.priority,
        complexity: "medium",
        financialImpact: (tDef.impactFlags || []).some((f) => f.startsWith("financial")),
        impactFlags: tDef.impactFlags || [],
        scope: tDef.origin === "proposed" ? "additional" : "original",
        origin: tDef.origin,
        assigneeId: null,
        validatorId: null,
        participantIds: [],
        durationMinutes: tDef.durationMinutes,
        durationSource: "confirmed",
        plannedStart: null,
        plannedEnd: null,
        pinned: false,
        status: "pending",
        actualStart: null,
        actualEnd: null,
        timeEntries: [],
        blockedReason: null,
        awaitingApproval: false,
        acceptanceCriteria: "",
        acceptedAt: null,
        acceptedBy: null,
        notes: "",
        evidence: [],
        learnings: {
          worked: "",
          didntWork: "",
          impediment: "",
          resolution: "",
          timeSpent: "",
          rework: "",
          automatable: "",
          nextImprovement: "",
        },
        materialVersion: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
        archivedAt: null,
        rev: 1,
        completionCriteria,
        deliverableMaterials,
        expertDemand: tDef.expertDemand,
      };
    });
  });

  // Funil Inicial 7D
  const funnel: Record<string, FunnelStage> = {
    "fn-1": { id: "fn-1", label: "Contatos Capturados (Meta Ads / Orgânico)", color: "#3B82F6", count: 0, position: 0 },
    "fn-2": { id: "fn-2", label: "Entradas no Grupo / Direct Iniciado", color: "#6366F1", count: 0, position: 1 },
    "fn-3": { id: "fn-3", label: "Triagem & Qualificação SDR", color: "#8B5CF6", count: 0, position: 2 },
    "fn-4": { id: "fn-4", label: "Pitch Comercial / Apresentação", color: "#EC4899", count: 0, position: 3 },
    "fn-5": { id: "fn-5", label: "Venda Realizada & Checkout Confirmado", color: "#10B981", count: 0, position: 4, value: 0 },
  };

  // 5 Marcos 7D
  const milestones: Record<string, Milestone> = {
    "m-1": {
      id: "m-1",
      sprintId: sprint.id,
      title: "MARCO 1: INFRAESTRUTURA & ACESSOS HOMOLOGADOS",
      position: 0,
      dueDate: "2026-10-23",
      ownerId: null,
      taskIds: ["task-7d-1", "task-7d-2"],
      criteria: ["BM, Contas, WhatsApp e Pixel validados", "Sem bloqueios de pagamento"],
      validatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "m-2": {
      id: "m-2",
      sprintId: sprint.id,
      title: "MARCO 2: MÁQUINA DE AQUISIÇÃO LIGADA",
      position: 1,
      dueDate: "2026-10-25",
      ownerId: null,
      taskIds: ["task-7d-3", "task-7d-4"],
      criteria: ["Campanhas ativas no Meta Ads", "Criativos do expert produzidos"],
      validatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "m-3": {
      id: "m-3",
      sprintId: sprint.id,
      title: "MARCO 3: DISTRIBUIÇÃO & CONTEÚDO ALINHADOS",
      position: 2,
      dueDate: "2026-10-27",
      ownerId: null,
      taskIds: ["task-7d-5", "task-7d-6"],
      criteria: ["Meta diária de visualizações definida", "Grade de Reels versionada"],
      validatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "m-4": {
      id: "m-4",
      sprintId: sprint.id,
      title: "MARCO 4: OPERAÇÃO COMERCIAL X1 ATIVA",
      position: 3,
      dueDate: "2026-10-29",
      ownerId: null,
      taskIds: ["task-7d-7", "task-7d-8"],
      criteria: ["Script de qualificação aplicado", "Pipeline no CRM recebendo leads"],
      validatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "m-5": {
      id: "m-5",
      sprintId: sprint.id,
      title: "MARCO 5: GOVERNANÇA, BACKUPS & RESULTADOS",
      position: 4,
      dueDate: "2026-10-31",
      ownerId: null,
      taskIds: ["task-7d-7", "task-7d-8"],
      criteria: ["Backups Master salvos", "Relatório de implementação emitido"],
      validatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
  };

  const routines: Record<string, RoutineDefinition> = {
    "rtn-1": {
      id: "rtn-1",
      sprintId: sprint.id,
      title: "Daily de Alinhamento 7D (15 min)",
      description: "Conferir gargalos, demandas do expert e métricas de aquisição do dia.",
      frequency: "workdays",
      weekday: null,
      time: "09:15",
      durationMinutes: 15,
      ownerId: null,
      checklist: [
        { id: "c-1", title: "Verificar gasto de ads e leads capturados" },
        { id: "c-2", title: "Identificar bloqueios ativos na esteira" },
        { id: "c-3", title: "Conferir status de demandas com o expert" },
      ],
      position: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
  };

  return {
    schemaVersion: 1,
    project,
    sprints: { [sprint.id]: sprint },
    stages,
    tasks,
    subtasks,
    dependencies: {},
    acknowledgements: {},
    members: {},
    calendars: { [defaultCalendar.id]: defaultCalendar },
    milestones,
    routines,
    routineOccurrences: {},
    financialRecords: {},
    changeRequests: {},
    funnel,
    publications: {},
    indicators: {},
    contentDistributionConfig: { dailyReelsTarget: 5000 },
    costs: {},
    prompts: {},
    revisions: {},
    activity: [
      {
        id: "act-init-7d",
        at: nowIso,
        actorName,
        action: "create",
        entity: "workspace",
        entityId: project.id,
        summary: "Template Arquitetura 7D inicializado com sucesso",
      },
    ],
    settings: {
      dailyThresholds: { start: 40, rhythm: 70, strong: 90 },
    },
  };
}
