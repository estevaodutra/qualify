/**
 * Seed Template Inicial: "Percurso da Vida" (Seções 2 e 26).
 * Este template é carregado como DADOS INICIAIS EDITÁVEIS no workspace.
 * Nenhum título ou dado aqui é hardcoded dentro de componentes de UI.
 */

import type {
  Dependency,
  FunnelStage,
  Milestone,
  Project,
  RoutineDefinition,
  Sprint,
  Stage,
  Subtask,
  Task,
  WorkCalendar,
  Workspace,
} from "../domain/types";
import { makeCalendar, makeSprint, makeStage, makeTask, makeSubtask } from "../domain/ops";

export function createPercursoDaVidaSeed(actorName = "Admin / Engenheiro"): Workspace {
  const nowIso = "2026-10-21T09:00:00.000Z";
  const ctx = { actorName, nowIso };

  // 1. Calendário Padrão
  const defaultCalendar = makeCalendar(ctx, {
    name: "Jornada Padrão Qualify (SP)",
    workStart: "09:00",
    workEnd: "18:00",
    breaks: [{ start: "12:00", end: "13:00" }],
    workDays: [1, 2, 3, 4, 5], // Seg a Sex
    holidays: ["2026-11-02", "2026-11-15", "2026-12-25"],
  });

  // 2. Projeto
  const project: Project = {
    id: "proj-percurso-da-vida",
    name: "Percurso da Vida",
    client: "Pablo e Flávia",
    description: "Implementação da máquina comercial, campanhas de aquisição, atendimento SDR e planejamento de webinar.",
    contractModel: "Empreitada com escopo definido",
    timezone: "America/Sao_Paulo",
    createdAt: nowIso,
    updatedAt: nowIso,
    archivedAt: null,
    rev: 1,
  };

  // 3. Sprint 01
  const sprint: Sprint = {
    id: "sprint-01",
    projectId: project.id,
    name: "Sprint 01 — Colocar a Máquina para Rodar",
    objective: "Construir e ativar a operação comercial com captação de leads, SDR, automações, Meta Ads e telemetria.",
    deliverables: [
      "CRM funcionando",
      "Pipeline configurado",
      "SDR atendendo",
      "Script de abordagem disponível",
      "Fluxos automáticos ativos",
      "Campanha de seguidores publicada",
      "Dois primeiros Post Ads publicados",
      "Geração de demanda iniciada",
      "Dashboard registrando indicadores",
      "Próximo webinar planejado",
      "Relatório de implementação",
      "Playbook documentado",
    ],
    position: 0,
    startDate: "2026-10-21",
    startTime: "09:00",
    businessDays: 10,
    calendarId: defaultCalendar.id,
    managerId: null,
    contractValue: 2500,
    revenueReceived: 2500,
    schedulingMode: "hybrid",
    activatedAt: null,
    baseline: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    archivedAt: null,
    rev: 1,
  };

  // 4. Etapas e Tarefas canônicas da Seção 26
  const stagesData: {
    title: string;
    tasks: {
      title: string;
      priority: "P0" | "P1" | "P2" | "P3";
      complexity: "low" | "medium" | "high";
      financialImpact: boolean;
      durationMinutes: number | null;
      subtasks: { title: string; target?: number; required?: boolean }[];
    }[];
  }[] = [
    {
      title: "ETAPA 01 — FUNDAÇÃO COMERCIAL",
      tasks: [
        {
          title: "Tarefa 01 — Validar acessos e escopo",
          priority: "P0",
          complexity: "low",
          financialImpact: false,
          durationMinutes: 120,
          subtasks: [
            { title: "Confirmar escopo", required: true },
            { title: "Validar CRM", required: true },
            { title: "Validar WhatsApp", required: true },
            { title: "Validar Meta Ads", required: true },
            { title: "Validar Instagram", required: true },
            { title: "Confirmar responsáveis", required: true },
            { title: "Registrar pendências", required: false },
          ],
        },
        {
          title: "Tarefa 02 — Criar CRM",
          priority: "P0",
          complexity: "medium",
          financialImpact: false,
          durationMinutes: 180,
          subtasks: [
            { title: "Criar workspace", required: true },
            { title: "Criar usuários", required: true },
            { title: "Configurar permissões", required: true },
            { title: "Criar campos personalizados", required: true },
            { title: "Configurar origens de tráfego", required: true },
            { title: "Testar cadastro de contato", required: true },
          ],
        },
        {
          title: "Tarefa 03 — Configurar Pipeline X1",
          priority: "P0",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 180,
          subtasks: [
            { title: "Configurar etapa Em Aberto", required: true },
            { title: "Configurar etapa ICP", required: true },
            { title: "Configurar etapa Interessado", required: true },
            { title: "Configurar etapa Follow-Up 24h", required: true },
            { title: "Configurar etapa Follow-Up 72h", required: true },
            { title: "Configurar etapa Follow-Up 7 dias", required: true },
            { title: "Configurar etapa Follow-Up 15 dias", required: true },
            { title: "Configurar etapa Call Agendada", required: true },
            { title: "Configurar etapa Venda Realizada", required: true },
            { title: "Configurar etapa Venda Perdida", required: true },
            { title: "Configurar etapa Lead Frio", required: true },
            { title: "Testar movimentações manuais de cards", required: true },
          ],
        },
      ],
    },
    {
      title: "ETAPA 02 — CONVERSÃO COMERCIAL",
      tasks: [
        {
          title: "Tarefa 04 — Criar script X1",
          priority: "P0",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 240,
          subtasks: [
            { title: "Elaborar Abertura de conversa", required: true },
            { title: "Perguntas de Qualificação", required: true },
            { title: "Identificação da necessidade/dor", required: true },
            { title: "Transição comercial", required: true },
            { title: "Roteiro de Agendamento de Call", required: true },
            { title: "Matriz de quebra de Objeções", required: true },
            { title: "Cadência de Follow-ups", required: true },
          ],
        },
        {
          title: "Tarefa 05 — Ativar SDR",
          priority: "P0",
          complexity: "low",
          financialImpact: true,
          durationMinutes: 120,
          subtasks: [
            { title: "Cadastrar usuário do operador", required: true },
            { title: "Liberar acessos e ramais", required: true },
            { title: "Configurar painel de atendimento", required: true },
            { title: "Validar canal WhatsApp ativo", required: true },
            { title: "Realizar testes práticos de envio", required: true },
          ],
        },
        {
          title: "Tarefa 06 — Treinar SDR",
          priority: "P1",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 180,
          subtasks: [
            { title: "Apresentar ICP e personas", required: true },
            { title: "Apresentar produto e oferta", required: true },
            { title: "Treinar abordagem com roleplay", required: true },
            { title: "Definir SLA de resposta (máx 5min)", required: true },
            { title: "Simular atendimento completo", required: true },
            { title: "Definir rotina diária de follow-up", required: true },
          ],
        },
      ],
    },
    {
      title: "ETAPA 03 — AUTOMAÇÕES",
      tasks: [
        {
          title: "Tarefa 07 — Configurar entrada de leads",
          priority: "P0",
          complexity: "high",
          financialImpact: true,
          durationMinutes: 240,
          subtasks: [
            { title: "Configurar integração de webhook", required: true },
            { title: "Mapear campos de formulário", required: true },
            { title: "Identificar origens (UTMs e fontes)", required: true },
            { title: "Configurar prevenção de duplicações", required: true },
            { title: "Configurar distribuição de contatos", required: true },
            { title: "Testar entrada com payload real", required: true },
          ],
        },
        {
          title: "Tarefa 08 — Configurar mensagens automáticas",
          priority: "P0",
          complexity: "high",
          financialImpact: true,
          durationMinutes: 300,
          subtasks: [
            { title: "Configurar Mensagem inicial instantânea", required: true },
            { title: "Configurar Follow-Up 24h", required: true },
            { title: "Configurar Follow-Up 72h", required: true },
            { title: "Configurar Follow-Up 7 dias", required: true },
            { title: "Configurar Follow-Up 15 dias", required: true },
            { title: "Definir regras de interrupção ao responder", required: true },
            { title: "Configurar movimentações automáticas de etapa", required: true },
            { title: "Executar testes ponta a ponta", target: 5, required: true },
          ],
        },
        {
          title: "Tarefa 09 — Validar jornada do lead",
          priority: "P0",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 120,
          subtasks: [
            { title: "Criar contato de teste", required: true },
            { title: "Verificar entrada instantânea", required: true },
            { title: "Testar disparo da automação", required: true },
            { title: "Testar transição para o SDR", required: true },
            { title: "Testar visualização no pipeline", required: true },
            { title: "Testar agendamento de chamada", required: true },
          ],
        },
      ],
    },
    {
      title: "ETAPA 04 — AQUISIÇÃO",
      tasks: [
        {
          title: "Tarefa 10 — Preparar Meta Ads",
          priority: "P0",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 150,
          subtasks: [
            { title: "Validar conta de anúncios e BM", required: true },
            { title: "Validar forma de pagamento", required: true },
            { title: "Definir público-alvo inicial", required: true },
            { title: "Definir orçamento diário de teste", required: true },
            { title: "Definir parâmetros de rastreamento", required: true },
          ],
        },
        {
          title: "Tarefa 11 — Criar Post Ad 01",
          priority: "P0",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 180,
          subtasks: [
            { title: "Definir Ângulo principal", required: true },
            { title: "Definir Gancho inicial (hook)", required: true },
            { title: "Redigir Copy persuasiva", required: true },
            { title: "Produzir Criativo visual", required: true },
            { title: "Definir CTA para WhatsApp", required: true },
            { title: "Colher Aprovação do cliente", required: true },
          ],
        },
        {
          title: "Tarefa 12 — Criar Post Ad 02",
          priority: "P0",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 180,
          subtasks: [
            { title: "Definir Ângulo alternativo", required: true },
            { title: "Definir Gancho secundário", required: true },
            { title: "Redigir Copy do ad 02", required: true },
            { title: "Produzir Criativo visual 02", required: true },
            { title: "Definir CTA para WhatsApp", required: true },
            { title: "Colher Aprovação do cliente", required: true },
          ],
        },
        {
          title: "Tarefa 13 — Ativar seguidores",
          priority: "P1",
          complexity: "low",
          financialImpact: false,
          durationMinutes: 90,
          subtasks: [
            { title: "Configurar Campanha no Gerenciador", required: true },
            { title: "Definir Público de interesse", required: true },
            { title: "Definir Orçamento de engajamento", required: true },
            { title: "Selecionar Conteúdo em destaque", required: true },
            { title: "Publicação da campanha", required: true },
            { title: "Validação da entrega de impressões", required: true },
          ],
        },
        {
          title: "Tarefa 14 — Publicar Post Ads",
          priority: "P0",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 120,
          subtasks: [
            { title: "Configurar campanha de conversão", required: true },
            { title: "Inserir anúncios criados", target: 2, required: true },
            { title: "Validar links e destinos do WhatsApp", required: true },
            { title: "Confirmar orçamento ativo", required: true },
            { title: "Publicar anúncios", required: true },
            { title: "Verificar início de entrega", required: true },
          ],
        },
        {
          title: "Tarefa 15 — Validar demanda",
          priority: "P0",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 120,
          subtasks: [
            { title: "Conferir métricas de cliques nas campanhas", required: true },
            { title: "Identificar chegada dos primeiros leads", required: true },
            { title: "Confirmar entrada no CRM", required: true },
            { title: "Confirmar primeiro atendimento pelo SDR", required: true },
            { title: "Corrigir possíveis bloqueios no fluxo", required: false },
          ],
        },
      ],
    },
    {
      title: "ETAPA 05 — INDICADORES",
      tasks: [
        {
          title: "Tarefa 16 — Criar dashboard comercial",
          priority: "P1",
          complexity: "high",
          financialImpact: false,
          durationMinutes: 240,
          subtasks: [
            { title: "Métricas de Leads por origem", required: true },
            { title: "Volume de Leads por dia", required: true },
            { title: "Distribuição de Leads por etapa do pipeline", required: true },
            { title: "Total de Atendimentos realizados", required: true },
            { title: "Total de Calls agendadas", required: true },
            { title: "Total de Vendas efetuadas", required: true },
            { title: "Taxas de conversão do funil", required: true },
          ],
        },
        {
          title: "Tarefa 17 — Integrar métricas",
          priority: "P1",
          complexity: "medium",
          financialImpact: false,
          durationMinutes: 150,
          subtasks: [
            { title: "Registrar Investimento de mídia", required: true },
            { title: "Calcular CPL (Custo por Lead)", required: true },
            { title: "Consolidar total de Leads únicos", required: true },
            { title: "Calcular Custo por Agendamento", required: true },
            { title: "Calcular CPA quando aplicável", required: false },
            { title: "Validação da consistência dos dados", required: true },
          ],
        },
      ],
    },
    {
      title: "ETAPA 06 — OTIMIZAÇÃO",
      tasks: [
        {
          title: "Tarefa 18 — Auditar SDR",
          priority: "P1",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 120,
          subtasks: [
            { title: "Revisar histórico de conversas gravadas", required: true },
            { title: "Verificar tempo médio de resposta", required: true },
            { title: "Identificar principais objeções de leads", required: true },
            { title: "Revisar e aprimorar script comercial", required: true },
            { title: "Registrar oportunidades de melhoria", required: true },
          ],
        },
        {
          title: "Tarefa 19 — Revisar anúncios",
          priority: "P1",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 120,
          subtasks: [
            { title: "Analisar frequência e alcance da entrega", required: true },
            { title: "Verificar custo por clique e lead", required: true },
            { title: "Avaliar qualidade dos leads gerados", required: true },
            { title: "Identificar gargalos de conversão nos ads", required: true },
            { title: "Registrar ajustes para novos criativos", required: true },
          ],
        },
        {
          title: "Tarefa 20 — Feedback executivo",
          priority: "P2",
          complexity: "low",
          financialImpact: false,
          durationMinutes: 60,
          subtasks: [
            { title: "Relatório: O que foi feito", required: true },
            { title: "Relatório: O que aconteceu", required: true },
            { title: "Relatório: Quais números tivemos", required: true },
            { title: "Plano: O que será ajustado", required: true },
          ],
        },
      ],
    },
    {
      title: "ETAPA 07 — WEBINAR",
      tasks: [
        {
          title: "Tarefa 21 — Briefing",
          priority: "P2",
          complexity: "medium",
          financialImpact: false,
          durationMinutes: 120,
          subtasks: [
            { title: "Definição clara do ICP alvo", required: true },
            { title: "Mapeamento da dor principal", required: true },
            { title: "Estruturação da oferta e entregáveis", required: true },
            { title: "Mecanismo único da solução", required: true },
            { title: "Provas sociais e cases", required: true },
            { title: "Alinhamento de responsáveis pelo evento", required: true },
          ],
        },
        {
          title: "Tarefa 22 — Estruturar narrativa",
          priority: "P2",
          complexity: "high",
          financialImpact: false,
          durationMinutes: 240,
          subtasks: [
            { title: "Elaborar Promessa impactante", required: true },
            { title: "Desenvolver Problema central", required: true },
            { title: "Apresentar a Solução inovadora", required: true },
            { title: "Montar Slides de Apresentação", required: true },
            { title: "Formular a Oferta irresistível", required: true },
            { title: "Definir CTA de fechamento", required: true },
          ],
        },
        {
          title: "Tarefa 23 — Planejar captura",
          priority: "P2",
          complexity: "medium",
          financialImpact: true,
          durationMinutes: 180,
          subtasks: [
            { title: "Definir Público para o webinar", required: true },
            { title: "Definir Ângulos de atração", required: true },
            { title: "Escolher Canal de transmissão", required: true },
            { title: "Testar Integração com página de captura", required: true },
            { title: "Orçamento previsto para tráfego", required: true },
            { title: "Briefing dos Próximos materiais de apoio", required: true },
          ],
        },
      ],
    },
    {
      title: "ETAPA 08 — ENCERRAMENTO",
      tasks: [
        {
          title: "Tarefa 24 — Auditoria",
          priority: "P1",
          complexity: "medium",
          financialImpact: false,
          durationMinutes: 120,
          subtasks: [
            { title: "Auditar integridade do CRM", required: true },
            { title: "Auditar movimentações do Pipeline", required: true },
            { title: "Auditar atendimento contínuo do SDR", required: true },
            { title: "Auditar disparo de Automações", required: true },
            { title: "Auditar entrega de Campanhas", required: true },
            { title: "Auditar precisão das Métricas", required: true },
            { title: "Levantar e registrar Pendências", required: false },
          ],
        },
        {
          title: "Tarefa 25 — Documentar playbook",
          priority: "P1",
          complexity: "high",
          financialImpact: false,
          durationMinutes: 240,
          subtasks: [
            { title: "Compilar Total de Horas gastas", required: true },
            { title: "Compilar Custos operacionais reais", required: true },
            { title: "Registrar Retrabalho ocorrido", required: true },
            { title: "Documentar Procedimentos operacionais padrão (SOP)", required: true },
            { title: "Exportar Templates replicáveis", required: true },
            { title: "Sistematizar Aprendizados da implementação", required: true },
          ],
        },
        {
          title: "Tarefa 26 — Formalizar entrega",
          priority: "P0",
          complexity: "low",
          financialImpact: true,
          durationMinutes: 90,
          subtasks: [
            { title: "Compilar Evidências finais de funcionamento", required: true },
            { title: "Gerar Relatório executivo completo", required: true },
            { title: "Tratar Pendências externas do cliente", required: false },
            { title: "Reunião de Handoff com o time", required: true },
            { title: "Colher Aceite formal do cliente", required: true },
            { title: "Alinhar Próximo ciclo / contratação contínua", required: false },
          ],
        },
      ],
    },
  ];

  const stages: Record<string, Stage> = {};
  const tasks: Record<string, Task> = {};
  const subtasks: Record<string, Subtask> = {};

  let globalTaskIndex = 0;
  stagesData.forEach((stData, stageIdx) => {
    const stageId = `stage-${stageIdx + 1}`;
    const stage: Stage = {
      id: stageId,
      sprintId: sprint.id,
      title: stData.title,
      position: stageIdx,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    };
    stages[stage.id] = stage;

    stData.tasks.forEach((tData, taskIdx) => {
      globalTaskIndex++;
      const taskId = `task-${String(globalTaskIndex).padStart(2, "0")}`;
      const task = makeTask(ctx, stage.id, tData.title, taskIdx, {
        id: taskId,
        priority: tData.priority,
        complexity: tData.complexity,
        financialImpact: tData.financialImpact,
        durationMinutes: tData.durationMinutes,
        durationSource: tData.durationMinutes ? "confirmed" : "unset",
      });
      tasks[task.id] = task;

      tData.subtasks.forEach((subData, subIdx) => {
        const subId = `sub-${taskId}-${subIdx + 1}`;
        const sub = makeSubtask(ctx, task.id, subData.title, subIdx, {
          id: subId,
          target: subData.target ?? null,
          required: subData.required ?? true,
        });
        subtasks[sub.id] = sub;
      });
    });
  });

  // 5. Dependências canônicas fundamentais entre tarefas
  const dependencies: Record<string, Dependency> = {
    "dep-01": { id: "dep-01", predecessorId: "task-01", successorId: "task-02" }, // Criar CRM após validar acessos
    "dep-02": { id: "dep-02", predecessorId: "task-02", successorId: "task-03" }, // Configurar Pipeline após CRM
    "dep-03": { id: "dep-03", predecessorId: "task-04", successorId: "task-06" }, // Treinar SDR após script
    "dep-04": { id: "dep-04", predecessorId: "task-03", successorId: "task-07" }, // Integrar entrada após pipeline
    "dep-05": { id: "dep-05", predecessorId: "task-07", successorId: "task-08" }, // Mensagens após entrada de leads
    "dep-06": { id: "dep-06", predecessorId: "task-08", successorId: "task-09" }, // Validar jornada após mensagens
    "dep-07": { id: "dep-07", predecessorId: "task-11", successorId: "task-14" }, // Publicar ads após criar ad 01
    "dep-08": { id: "dep-08", predecessorId: "task-12", successorId: "task-14" }, // Publicar ads após criar ad 02
    "dep-09": { id: "dep-09", predecessorId: "task-09", successorId: "task-14" }, // Só publica tráfego com jornada validada!
    "dep-10": { id: "dep-10", predecessorId: "task-14", successorId: "task-15" }, // Validar demanda após publicar ads
    "dep-11": { id: "dep-11", predecessorId: "task-15", successorId: "task-16" }, // Dashboard comercial após validação da demanda
    "dep-12": { id: "dep-12", predecessorId: "task-24", successorId: "task-26" }, // Formalizar entrega após auditoria
  };

  // 6. Marcos da Seção 25
  const milestones: Record<string, Milestone> = {
    "m-1": {
      id: "m-1",
      sprintId: sprint.id,
      title: "MARCO 1 — ESTRUTURA COMERCIAL",
      position: 0,
      dueDate: "2026-10-23",
      ownerId: null,
      taskIds: ["task-01", "task-02", "task-03", "task-04", "task-05", "task-06"],
      criteria: ["CRM funcionando", "Pipeline testado", "Script pronto", "SDR treinado e com acessos"],
      validatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "m-2": {
      id: "m-2",
      sprintId: sprint.id,
      title: "MARCO 2 — AQUISIÇÃO ATIVA",
      position: 1,
      dueDate: "2026-10-27",
      ownerId: null,
      taskIds: ["task-07", "task-08", "task-09", "task-10", "task-11", "task-12", "task-13", "task-14"],
      criteria: ["Automações disparando", "Seguidores ativos", "Post Ads publicados", "Tráfego entregando"],
      validatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "m-3": {
      id: "m-3",
      sprintId: sprint.id,
      title: "MARCO 3 — OPERAÇÃO MONITORADA",
      position: 2,
      dueDate: "2026-10-29",
      ownerId: null,
      taskIds: ["task-15", "task-16", "task-17", "task-18", "task-19", "task-20"],
      criteria: ["Leads rastreados", "Atendimentos registrados no SLA", "Dashboard comercial ativo", "Feedback executivo realizado"],
      validatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "m-4": {
      id: "m-4",
      sprintId: sprint.id,
      title: "MARCO 4 — WEBINAR PLANEJADO",
      position: 3,
      dueDate: "2026-10-31",
      ownerId: null,
      taskIds: ["task-21", "task-22", "task-23"],
      criteria: ["Briefing de oferta aprovado", "Narrativa e slides formulados", "Captura de leads planejada"],
      validatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "m-5": {
      id: "m-5",
      sprintId: sprint.id,
      title: "MARCO 5 — IMPLEMENTAÇÃO ENTREGUE",
      position: 4,
      dueDate: "2026-11-04",
      ownerId: null,
      taskIds: ["task-24", "task-25", "task-26"],
      criteria: ["Auditoria técnica aprovada", "Evidências anexadas", "Playbook documentado", "Aceite formal colhido"],
      validatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
  };

  // 7. Rotinas Diárias da Seção 24
  const routines: Record<string, RoutineDefinition> = {
    "rot-1": {
      id: "rot-1",
      sprintId: sprint.id,
      title: "Conferir novos leads",
      description: "Verificar volume de contatos entrantes no CRM e checar integridade de formulários.",
      frequency: "workdays",
      weekday: null,
      time: "09:15",
      durationMinutes: 15,
      ownerId: null,
      checklist: [{ id: "c1", title: "Verificar webhook" }, { id: "c2", title: "Checar tags de origem" }],
      position: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "rot-2": {
      id: "rot-2",
      sprintId: sprint.id,
      title: "Verificar SDR e SLA de atendimento",
      description: "Conferir tempo de primeira resposta e conversas em aberto.",
      frequency: "workdays",
      weekday: null,
      time: "10:00",
      durationMinutes: 20,
      ownerId: null,
      checklist: [{ id: "c1", title: "Auditar 3 conversas no WhatsApp" }, { id: "c2", title: "Cobrar tempo de resposta" }],
      position: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "rot-3": {
      id: "rot-3",
      sprintId: sprint.id,
      title: "Conferir pipeline comercial e movimentações",
      description: "Garantir que nenhum lead está parado sem etapa definida ou sem próximo passo.",
      frequency: "workdays",
      weekday: null,
      time: "11:30",
      durationMinutes: 15,
      ownerId: null,
      checklist: [{ id: "c1", title: "Revisar etapa Em Aberto" }, { id: "c2", title: "Checar calls agendadas" }],
      position: 2,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "rot-4": {
      id: "rot-4",
      sprintId: sprint.id,
      title: "Executar follow-ups programados",
      description: "Disparo da cadência ativa para leads em espera de resposta.",
      frequency: "workdays",
      weekday: null,
      time: "14:00",
      durationMinutes: 30,
      ownerId: null,
      checklist: [{ id: "c1", title: "Disparar follow-up 24h" }, { id: "c2", title: "Disparar follow-up 72h" }],
      position: 3,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "rot-5": {
      id: "rot-5",
      sprintId: sprint.id,
      title: "Verificar campanhas no Meta Ads",
      description: "Checar orçamento consumido, CPC, CTR e status ativo dos anúncios.",
      frequency: "workdays",
      weekday: null,
      time: "16:00",
      durationMinutes: 20,
      ownerId: null,
      checklist: [{ id: "c1", title: "Verificar saldo/faturamento" }, { id: "c2", title: "Checar custo por lead" }],
      position: 4,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "rot-6": {
      id: "rot-6",
      sprintId: sprint.id,
      title: "Atualizar métricas e telemetria",
      description: "Inserir números consolidados do dia na planilha / dashboard.",
      frequency: "workdays",
      weekday: null,
      time: "17:30",
      durationMinutes: 15,
      ownerId: null,
      checklist: [{ id: "c1", title: "Contar leads totais" }, { id: "c2", title: "Contar calls agendadas e realizadas" }],
      position: 5,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "rot-7": {
      id: "rot-7",
      sprintId: sprint.id,
      title: "Registrar bloqueios e impedimentos",
      description: "Sinalizar pendências técnicas ou atrasos que requerem intervenção.",
      frequency: "workdays",
      weekday: null,
      time: "17:45",
      durationMinutes: 10,
      ownerId: null,
      checklist: [{ id: "c1", title: "Verificar tarefas atrasadas" }, { id: "c2", title: "Acionar cliente/equipe se necessário" }],
      position: 6,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
    "rot-8": {
      id: "rot-8",
      sprintId: sprint.id,
      title: "Registrar aprendizados do dia",
      description: "Documentar soluções encontradas e oportunidades de automação.",
      frequency: "workdays",
      weekday: null,
      time: "18:00",
      durationMinutes: 10,
      ownerId: null,
      checklist: [{ id: "c1", title: "Preencher aprendizado na tarefa" }, { id: "c2", title: "Atualizar playbook interno" }],
      position: 7,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
      rev: 1,
    },
  ];

  // 8. Funil Comercial X1 da Seção 27
  const funnelStagesList = [
    { label: "Em Aberto", color: "#EF4444" },
    { label: "ICP", color: "#F97316" },
    { label: "Interessado", color: "#EAB308" },
    { label: "Follow-Up 24h", color: "#3B82F6" },
    { label: "Follow-Up 72h", color: "#3B82F6" },
    { label: "Follow-Up 7 dias", color: "#3B82F6" },
    { label: "Follow-Up 15 dias", color: "#3B82F6" },
    { label: "Call Agendada", color: "#A855F7" },
    { label: "Venda Realizada", color: "#22C55E" },
    { label: "Venda Perdida", color: "#64748B" },
    { label: "Lead Frio", color: "#06B6D4" },
  ];

  const funnel: Record<string, FunnelStage> = {};
  funnelStagesList.forEach((st, idx) => {
    const id = `funnel-${idx + 1}`;
    funnel[id] = {
      id,
      label: st.label,
      color: st.color,
      count: 0,
      position: idx,
    };
  });

  return {
    schemaVersion: 1,
    project,
    sprints: { [sprint.id]: sprint },
    stages,
    tasks,
    subtasks,
    dependencies,
    acknowledgements: {},
    members: {},
    calendars: { [defaultCalendar.id]: defaultCalendar },
    milestones,
    routines,
    routineOccurrences: {},
    financialRecords: {},
    changeRequests: {},
    funnel,
    costs: {},
    prompts: {},
    revisions: {},
    activity: [
      {
        id: "act-init",
        at: nowIso,
        actorName,
        action: "create",
        entity: "workspace",
        entityId: project.id,
        summary: "Template matriz 'Percurso da Vida' inicializado com sucesso.",
      },
    ],
    settings: {
      dailyThresholds: { start: 40, rhythm: 70, strong: 90 },
    },
  };
}
