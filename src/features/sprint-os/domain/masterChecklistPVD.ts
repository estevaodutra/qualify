/**
 * AJ-027 — SIMPLIFICAÇÃO COMPLETA DO KANBAN PVD
 *
 * Estrutura: ETAPA → TAREFA → SUBTAREFA (Controle de Entregas)
 * 13 Etapas oficiais e exatamente 71 Tarefas operacionais concretas (T01 a T71).
 * Cada tarefa possui preferencialmente de 2 a 5 checks objetivos e acionáveis com verbos de ação.
 *
 * Migração Segura:
 * - Preserva IDs das tarefas existentes;
 * - Preserva conclusões comprovadas (subtarefas já concluídas continuam concluídas);
 * - Preserva status (done, in_progress, pending), responsáveis e sessões de cronômetro;
 * - Arquiva itens de formulários extensos e redundantes para auditoria;
 * - Elimina tarefas template antigas órfãs que inflavam a contagem do quadro;
 * - Fornece links diretos para navegação imediata ao módulo correspondente.
 */

import type {
  Workspace,
  Stage,
  Task,
  Subtask,
  Priority,
  Complexity,
} from "./types";
import {
  base,
  newId,
  makeTask,
  makeSubtask,
  touch,
  log,
} from "./ops";

export type NavigationTarget = {
  tab:
    | "structure"
    | "kanban"
    | "gantt"
    | "indicators"
    | "calculators"
    | "funnel"
    | "routines"
    | "milestones"
    | "brand_manual"
    | "creatives"
    | "scripts_and_audios";
  moduleId?: string;
  label: string;
};

export interface MasterTaskDefinition {
  code: string; // "T01" a "T71"
  legacyCodes?: string[]; // "01.01", "IM-01", etc.
  title: string;
  priority: Priority;
  complexity: Complexity;
  destination?: NavigationTarget;
  subtasks: string[];
}

export interface MasterStageDefinition {
  code: string; // "ETAPA-01" a "ETAPA-13"
  title: string;
  position: number;
  priority: Priority;
  tasks: MasterTaskDefinition[];
}

export const MASTER_STAGES_AJ027: MasterStageDefinition[] = [
  // =========================================================================
  // ETAPA 01 — INTELIGÊNCIA DO EXPERT
  // =========================================================================
  {
    code: "ETAPA-01",
    title: "ETAPA 01 — INTELIGÊNCIA DO EXPERT",
    position: 0,
    priority: "P1",
    tasks: [
      {
        code: "T01",
        legacyCodes: ["01.01", "IM-01"],
        title: "T01 — ⏳ Preencher Posicionamento | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "brand_manual", moduleId: "posicionamento", label: "Manual de Marca" },
        subtasks: [
          "Preencher Manual de Marca — Posicionamento.",
          "Confirmar preenchimento.",
          "Gerar e aprovar análise.",
        ],
      },
      {
        code: "T02",
        legacyCodes: ["01.02", "IM-02"],
        title: "T02 — ⏳ Preencher Alma da Copy | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "brand_manual", moduleId: "alma_copy", label: "Manual de Marca" },
        subtasks: [
          "Preencher Manual de Marca — Alma da Copy.",
          "Confirmar preenchimento.",
          "Gerar e aprovar análise.",
        ],
      },
      {
        code: "T03",
        legacyCodes: ["01.03", "IM-03"],
        title: "T03 — ⏳ Preencher Raio X do ICP | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "brand_manual", moduleId: "raio_x_icp", label: "Manual de Marca" },
        subtasks: [
          "Preencher Manual de Marca — Raio X do ICP.",
          "Confirmar preenchimento.",
          "Gerar e aprovar análise.",
        ],
      },
      {
        code: "T04",
        legacyCodes: ["01.04", "IM-04"],
        title: "T04 — ⏳ Preencher Personalidade | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "brand_manual", moduleId: "personalidade", label: "Manual de Marca" },
        subtasks: [
          "Preencher Manual de Marca — Personalidade.",
          "Confirmar preenchimento.",
          "Consolidar linguagem do expert.",
        ],
      },
      {
        code: "T05",
        legacyCodes: ["01.05", "IM-05"],
        title: "T05 — Gerar Copy ADS | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Gerar dez variantes.",
          "Revisar e aprovar copies.",
          "Disponibilizar para Criativos.",
        ],
      },
      {
        code: "T06",
        legacyCodes: ["01.06", "IM-06"],
        title: "T06 — Consolidar Master Prompt | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "brand_manual", label: "Manual de Marca" },
        subtasks: [
          "Gerar Master Prompt.",
          "Revisar e aprovar.",
          "Salvar versão final.",
        ],
      },
      {
        code: "T07",
        legacyCodes: ["01.07", "IM-07"],
        title: "T07 — ⏳ Coletar Áudios do Expert | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "scripts_and_audios", label: "Scripts e Áudios" },
        subtasks: [
          "Criar solicitações em Scripts e Áudios.",
          "⏳ Receber gravações.",
          "Revisar e salvar áudios.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 02 — GRUPO DE CAPTAÇÃO
  // =========================================================================
  {
    code: "ETAPA-02",
    title: "ETAPA 02 — GRUPO DE CAPTAÇÃO",
    position: 1,
    priority: "P1",
    tasks: [
      {
        code: "T08",
        legacyCodes: ["02.01"],
        title: "T08 — Configurar Grupo | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Criar grupo e configurar permissões.",
          "Gerar link de convite.",
          "Testar entrada no grupo.",
        ],
      },
      {
        code: "T09",
        legacyCodes: ["02.02", "GRP-01"],
        title: "T09 — ⏳ Criar Capa do Grupo | P1",
        priority: "P1",
        complexity: "low",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar briefing da capa.",
          "⏳ Produzir e aprovar arte.",
          "Aplicar capa no grupo.",
        ],
      },
      {
        code: "T10",
        legacyCodes: ["02.03", "GRP-02"],
        title: "T10 — Criar Descrição do Grupo | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Criar descrição.",
          "Aprovar texto.",
          "Aplicar no grupo.",
        ],
      },
      {
        code: "T11",
        legacyCodes: ["02.04", "GRP-03"],
        title: "T11 — Criar Sequência de Copies do Grupo | P1",
        priority: "P1",
        complexity: "medium",
        subtasks: [
          "Criar boas-vindas e contextualização.",
          "Criar copies dos três períodos.",
          "Criar levantamentos de mão.",
          "Aprovar sequência.",
        ],
      },
      {
        code: "T12",
        legacyCodes: ["02.05", "GRP-VID-01"],
        title: "T12 — ⏳ Produzir Vídeo GRP-VID-01 — Manhã | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar roteiro.",
          "⏳ Gravar e editar vídeo.",
          "Aprovar e salvar em Criativos.",
        ],
      },
      {
        code: "T13",
        legacyCodes: ["02.06", "GRP-VID-02"],
        title: "T13 — ⏳ Produzir Vídeo GRP-VID-02 — Meio do Dia | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar roteiro de prova/conteúdo.",
          "⏳ Gravar e editar.",
          "Aprovar e salvar em Criativos.",
        ],
      },
      {
        code: "T14",
        legacyCodes: ["02.07", "GRP-VID-03"],
        title: "T14 — ⏳ Produzir Vídeo GRP-VID-03 — Final do Dia | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar roteiro.",
          "⏳ Gravar e editar.",
          "Aprovar e salvar em Criativos.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 03 — AUTOMAÇÕES DO GRUPO
  // =========================================================================
  {
    code: "ETAPA-03",
    title: "ETAPA 03 — AUTOMAÇÕES DO GRUPO",
    position: 2,
    priority: "P1",
    tasks: [
      {
        code: "T15",
        legacyCodes: ["03.01", "AUTO-01"],
        title: "T15 — Automatizar AUTO-01 — Entrada | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Configurar entrada e boas-vindas.",
          "Testar recebimento.",
          "Aprovar fluxo.",
        ],
      },
      {
        code: "T16",
        legacyCodes: ["03.02", "AUTO-02"],
        title: "T16 — Automatizar AUTO-02 — Manhã, 08h00 | P1",
        priority: "P1",
        complexity: "medium",
        subtasks: [
          "Programar copy, GRP-VID-01 e levantada de mão.",
          "Testar envio das 08h00.",
          "Aprovar fluxo.",
        ],
      },
      {
        code: "T17",
        legacyCodes: ["03.03", "AUTO-03"],
        title: "T17 — Automatizar AUTO-03 — Meio do Dia | P1",
        priority: "P1",
        complexity: "medium",
        subtasks: [
          "⏳ Confirmar horário.",
          "Programar copy, GRP-VID-02 e levantada de mão.",
          "Testar e aprovar fluxo.",
        ],
      },
      {
        code: "T18",
        legacyCodes: ["03.04", "AUTO-04"],
        title: "T18 — Automatizar AUTO-04 — Final do Dia | P1",
        priority: "P1",
        complexity: "medium",
        subtasks: [
          "⏳ Confirmar horário.",
          "Programar copy, GRP-VID-03 e levantada de mão.",
          "Testar e aprovar fluxo.",
        ],
      },
      {
        code: "T19",
        legacyCodes: ["03.05", "AUTO-05"],
        title: "T19 — Automatizar AUTO-05 — Palavras-chave | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "funnel", label: "CRM" },
        subtasks: [
          "Configurar palavras-chave e respostas.",
          "Vincular encaminhamento comercial.",
          "Testar e aprovar fluxo.",
        ],
      },
      {
        code: "T20",
        legacyCodes: ["03.06", "AUTO-06"],
        title: "T20 — Automatizar AUTO-06 — Saída | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Validar disponibilidade do gatilho.",
          "Configurar tratamento da saída, se suportado.",
          "Testar e aprovar.",
        ],
      },
      {
        code: "T21",
        legacyCodes: ["03.07", "TEST-01"],
        title: "T21 — Validar Operação do Grupo | P1",
        priority: "P1",
        complexity: "high",
        subtasks: [
          "Testar entradas e saídas disponíveis.",
          "Testar copies, vídeos e interações.",
          "Corrigir falhas e aprovar operação.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 04 — INSTAGRAM E INFRAESTRUTURA
  // =========================================================================
  {
    code: "ETAPA-04",
    title: "ETAPA 04 — INSTAGRAM E INFRAESTRUTURA",
    position: 3,
    priority: "P1",
    tasks: [
      {
        code: "T22",
        legacyCodes: ["04.01"],
        title: "T22 — Configurar Instagram | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Atualizar bio e link.",
          "Revisar perfil.",
          "Testar captação.",
        ],
      },
      {
        code: "T23",
        legacyCodes: ["04.02"],
        title: "T23 — ⏳ Criar Destaque do Instagram | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar conteúdo e capa.",
          "⏳ Produzir e aprovar.",
          "Publicar e revisar.",
        ],
      },
      {
        code: "T24",
        legacyCodes: ["04.03"],
        title: "T24 — ⏳ Criar Post de Posicionamento | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar copy.",
          "⏳ Produzir arte.",
          "Aprovar e publicar.",
        ],
      },
      {
        code: "T25",
        legacyCodes: ["04.04"],
        title: "T25 — ⏳ Criar Carrossel | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar sequência de conteúdo.",
          "⏳ Produzir design.",
          "Aprovar e publicar.",
        ],
      },
      {
        code: "T26",
        legacyCodes: ["04.05"],
        title: "T26 — ⏳ Criar Story Estático | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar copy e CTA.",
          "⏳ Produzir arte.",
          "Aprovar e publicar.",
        ],
      },
      {
        code: "T27",
        legacyCodes: ["04.06"],
        title: "T27 — Configurar Meta Ads | P1",
        priority: "P1",
        complexity: "medium",
        subtasks: [
          "Validar BM e conta de anúncios.",
          "Configurar permissões e pagamento.",
          "Testar estrutura e liberar anúncios.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 05 — FUNIL COMERCIAL E CRM
  // =========================================================================
  {
    code: "ETAPA-05",
    title: "ETAPA 05 — FUNIL COMERCIAL E CRM",
    position: 4,
    priority: "P1",
    tasks: [
      {
        code: "T28",
        legacyCodes: ["05.01"],
        title: "T28 — Criar Pré-qualificação | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "funnel", label: "CRM" },
        subtasks: [
          "Criar script de entrada e perguntas.",
          "Revisar e aprovar.",
          "Configurar no CRM.",
        ],
      },
      {
        code: "T29",
        legacyCodes: ["05.02"],
        title: "T29 — Criar Script de Negociação | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "funnel", label: "CRM" },
        subtasks: [
          "Criar perguntas e tratamento de objeções.",
          "Revisar e aprovar.",
          "Vincular ao CRM.",
        ],
      },
      {
        code: "T30",
        legacyCodes: ["05.03"],
        title: "T30 — Criar Script de Venda | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "funnel", label: "CRM" },
        subtasks: [
          "Validar oferta e condições.",
          "Criar e aprovar script.",
          "Vincular checkout.",
        ],
      },
      {
        code: "T31",
        legacyCodes: ["05.04"],
        title: "T31 — Configurar CRM | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "funnel", label: "Pipeline CRM" },
        subtasks: [
          "Configurar Pipeline CRM.",
          "Fazer revisão.",
          "Consolidar CRM.",
        ],
      },
      {
        code: "T32",
        legacyCodes: ["05.05"],
        title: "T32 — Configurar Checkout | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "funnel", label: "Checkout" },
        subtasks: [
          "Configurar produto e pagamento.",
          "Testar checkout.",
          "Aprovar e salvar link.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 06 — AQUISIÇÃO INICIAL
  // =========================================================================
  {
    code: "ETAPA-06",
    title: "ETAPA 06 — AQUISIÇÃO INICIAL",
    position: 5,
    priority: "P1",
    tasks: [
      {
        code: "T33",
        legacyCodes: ["06.01"],
        title: "T33 — ⏳ Preparar Criativos Iniciais | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Selecionar ou criar AQ-01, AQ-02 e AQ-03.",
          "⏳ Finalizar materiais pendentes.",
          "Aprovar criativos.",
        ],
      },
      {
        code: "T34",
        legacyCodes: ["06.02"],
        title: "T34 — ⏳ Confirmar Verba | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Definir orçamento.",
          "⏳ Confirmar disponibilidade.",
          "Liberar ativação.",
        ],
      },
      {
        code: "T35",
        legacyCodes: ["06.03"],
        title: "T35 — Ativar Aquisição Inicial | P1",
        priority: "P1",
        complexity: "medium",
        subtasks: [
          "Configurar três anúncios/impulsionamentos.",
          "Testar destino e rastreamento.",
          "Ativar e verificar entrega.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 07 — WEBINÁRIO
  // =========================================================================
  {
    code: "ETAPA-07",
    title: "ETAPA 07 — WEBINÁRIO",
    position: 6,
    priority: "P1",
    tasks: [
      {
        code: "T36",
        legacyCodes: ["07.01"],
        title: "T36 — ⏳ Definir Webinário | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "structure", label: "Webinário" },
        subtasks: [
          "Preencher briefing do evento.",
          "⏳ Confirmar conteúdo, data e horário.",
          "Consolidar roteiro.",
        ],
      },
      {
        code: "T37",
        legacyCodes: ["07.02"],
        title: "T37 — Criar Nove Copies do Webinário | P1",
        priority: "P1",
        complexity: "medium",
        subtasks: [
          "Criar três copies de antecipação.",
          "Criar três copies do dia do evento.",
          "Criar três copies pós-evento.",
          "Aprovar e vincular à programação.",
        ],
      },
      {
        code: "T38",
        legacyCodes: ["07.03"],
        title: "T38 — ⏳ Produzir WEB-A01 a WEB-A03 | P1",
        priority: "P1",
        complexity: "high",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar três roteiros.",
          "⏳ Gravar e editar três vídeos.",
          "Aprovar e salvar.",
        ],
      },
      {
        code: "T39",
        legacyCodes: ["07.04"],
        title: "T39 — ⏳ Produzir WEB-B01 a WEB-B03 | P1",
        priority: "P1",
        complexity: "high",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar três roteiros.",
          "⏳ Gravar e editar três vídeos.",
          "Aprovar e salvar.",
        ],
      },
      {
        code: "T40",
        legacyCodes: ["07.05"],
        title: "T40 — Configurar Google Meet | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Criar e configurar sala.",
          "Testar acesso e recursos.",
          "Aprovar link do evento.",
        ],
      },
      {
        code: "T41",
        legacyCodes: ["07.06"],
        title: "T41 — Criar Comunicação \"Estamos ao Vivo\" | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Criar copy e CTA.",
          "Vincular link da live.",
          "Programar e testar envio.",
        ],
      },
      {
        code: "T42",
        legacyCodes: ["07.07"],
        title: "T42 — Criar Comunicação \"Encerrou\" | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Criar copy e CTA pós-evento.",
          "Vincular destino.",
          "Programar e testar envio.",
        ],
      },
      {
        code: "T43",
        legacyCodes: ["07.08"],
        title: "T43 — Automatizar Convites e Confirmações | P1",
        priority: "P1",
        complexity: "medium",
        subtasks: [
          "Configurar convites e confirmação.",
          "Programar comunicações do evento.",
          "Testar e aprovar fluxo.",
        ],
      },
      {
        code: "T44",
        legacyCodes: ["07.09"],
        title: "T44 — Validar Webinário | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "structure", label: "Webinário" },
        subtasks: [
          "Revisar sala, materiais e links.",
          "Testar confirmação e checkout.",
          "Aprovar operação.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 08 — CAMPANHAS DE VALIDAÇÃO
  // =========================================================================
  {
    code: "ETAPA-08",
    title: "ETAPA 08 — CAMPANHAS DE VALIDAÇÃO",
    position: 7,
    priority: "P1",
    tasks: [
      {
        code: "T45",
        legacyCodes: ["08.01"],
        title: "T45 — Estruturar Quatro Campanhas | P1",
        priority: "P1",
        complexity: "medium",
        subtasks: [
          "Configurar matriz de campanhas e ângulos.",
          "Definir destinos e orçamentos.",
          "Aprovar estrutura.",
        ],
      },
      {
        code: "T46",
        legacyCodes: ["08.02"],
        title: "T46 — ⏳ Campanha Conexão e Solução | P1",
        priority: "P1",
        complexity: "high",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar três roteiros C01-01 a C01-03.",
          "⏳ Produzir e aprovar três criativos.",
          "Configurar e testar campanha.",
          "Ativar após liberação.",
        ],
      },
      {
        code: "T47",
        legacyCodes: ["08.03"],
        title: "T47 — ⏳ Campanha Provas e Evidências | P1",
        priority: "P1",
        complexity: "high",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar três roteiros C02-01 a C02-03.",
          "⏳ Produzir e aprovar três criativos.",
          "Configurar e testar campanha.",
          "Ativar após liberação.",
        ],
      },
      {
        code: "T48",
        legacyCodes: ["08.04"],
        title: "T48 — ⏳ Campanha Autoridade e Relevância | P1",
        priority: "P1",
        complexity: "high",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar três roteiros C03-01 a C03-03.",
          "⏳ Produzir e aprovar três criativos.",
          "Configurar e testar campanha.",
          "Ativar após liberação.",
        ],
      },
      {
        code: "T49",
        legacyCodes: ["08.05"],
        title: "T49 — ⏳ Campanha Boi de Piranha | P1",
        priority: "P1",
        complexity: "high",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Validar oferta gratuita e destino.",
          "Criar três roteiros BP-01 a BP-03.",
          "⏳ Produzir e aprovar três criativos.",
          "Configurar, testar e ativar.",
        ],
      },
      {
        code: "T50",
        legacyCodes: ["08.06"],
        title: "T50 — ⏳ Confirmar Orçamento das Campanhas | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Definir budget.",
          "⏳ Aprovar e disponibilizar verba.",
          "Liberar testes.",
        ],
      },
      {
        code: "T51",
        legacyCodes: ["08.07"],
        title: "T51 — Monitorar Campanhas | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "structure", label: "Dashboard" },
        subtasks: [
          "Registrar investimento e captação.",
          "Comparar criativos e conversões.",
          "Consolidar resultados.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 09 — DISTRIBUIÇÃO ORGÂNICA
  // =========================================================================
  {
    code: "ETAPA-09",
    title: "ETAPA 09 — DISTRIBUIÇÃO ORGÂNICA",
    position: 8,
    priority: "P2",
    tasks: [
      {
        code: "T52",
        legacyCodes: ["09.01"],
        title: "T52 — Definir Formato Orgânico | P2",
        priority: "P2",
        complexity: "low",
        subtasks: [
          "Criar formato de vídeo e estrutura de copy.",
          "⏳ Validar com expert.",
          "Consolidar modelo.",
        ],
      },
      {
        code: "T53",
        legacyCodes: ["09.02"],
        title: "T53 — ⏳ Produzir Lote Orgânico | P2",
        priority: "P2",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar roteiros do lote.",
          "⏳ Gravar e editar.",
          "Aprovar e salvar na biblioteca.",
        ],
      },
      {
        code: "T54",
        legacyCodes: ["09.03"],
        title: "T54 — Programar Publicações | P2",
        priority: "P2",
        complexity: "medium",
        subtasks: [
          "Organizar lote.",
          "Programar na Criafy.",
          "Conferir agendamentos e publicação.",
        ],
      },
      {
        code: "T55",
        legacyCodes: ["09.04"],
        title: "T55 — ⏳ Criar Três Stories Coringa | P2",
        priority: "P2",
        complexity: "medium",
        destination: { tab: "creatives", label: "Criativos" },
        subtasks: [
          "Criar três conteúdos.",
          "⏳ Produzir e aprovar.",
          "Salvar na biblioteca.",
        ],
      },
      {
        code: "T56",
        legacyCodes: ["09.05"],
        title: "T56 — Criar Narrativa Coringa | P2",
        priority: "P2",
        complexity: "low",
        subtasks: [
          "Criar copy reutilizável.",
          "Revisar e aprovar.",
          "Salvar preset.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 10 — REMARKETING
  // =========================================================================
  {
    code: "ETAPA-10",
    title: "ETAPA 10 — REMARKETING",
    position: 9,
    priority: "P1",
    tasks: [
      {
        code: "T57",
        legacyCodes: ["10.01"],
        title: "T57 — Criar Recuperação Comercial | P1",
        priority: "P1",
        complexity: "medium",
        destination: { tab: "funnel", label: "CRM" },
        subtasks: [
          "Criar script de recuperação.",
          "Revisar e aprovar.",
          "Vincular ao CRM.",
        ],
      },
      {
        code: "T58",
        legacyCodes: ["10.02"],
        title: "T58 — Automatizar Remarketing | P1",
        priority: "P1",
        complexity: "medium",
        subtasks: [
          "Configurar segmentos e fluxos.",
          "Testar mensagens e exclusões.",
          "Aprovar e ativar.",
        ],
      },
      {
        code: "T59",
        legacyCodes: ["10.03"],
        title: "T59 — ⏳ Criar Produto Secundário | P2",
        priority: "P2",
        complexity: "medium",
        destination: { tab: "funnel", label: "Checkout" },
        subtasks: [
          "⏳ Definir proposta e preço.",
          "Criar copy e checkout.",
          "Testar e aprovar.",
        ],
      },
      {
        code: "T60",
        legacyCodes: ["10.04"],
        title: "T60 — ⏳ Criar Comunidade Recorrente | P2",
        priority: "P2",
        complexity: "medium",
        subtasks: [
          "⏳ Definir conteúdo e condições.",
          "Configurar oferta recorrente.",
          "Testar e aprovar.",
        ],
      },
      {
        code: "T61",
        legacyCodes: ["10.05"],
        title: "T61 — Organizar Relacionamento Passivo | P3",
        priority: "P3",
        complexity: "low",
        subtasks: [
          "Definir público e conteúdos.",
          "Configurar cadência.",
          "Testar e acompanhar.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 11 — DASHBOARD E PERFORMANCE
  // =========================================================================
  {
    code: "ETAPA-11",
    title: "ETAPA 11 — DASHBOARD E PERFORMANCE",
    position: 10,
    priority: "P1",
    tasks: [
      {
        code: "T62",
        legacyCodes: ["11.01"],
        title: "T62 — Validar Indicadores INFRA | P1",
        priority: "P1",
        complexity: "low",
        destination: { tab: "structure", label: "Dashboard" },
        subtasks: [
          "Configurar fontes e valores.",
          "Revisar consistência.",
          "Validar dashboard.",
        ],
      },
      {
        code: "T63",
        legacyCodes: ["11.02"],
        title: "T63 — Configurar Indicadores WEBINÁRIO | P1",
        priority: "P1",
        complexity: "low",
        destination: { tab: "structure", label: "Webinário" },
        subtasks: [
          "Configurar convidados e confirmações.",
          "Configurar entradas e permanência.",
          "Configurar compradores.",
          "Testar dados e conversões.",
        ],
      },
      {
        code: "T64",
        legacyCodes: ["11.03"],
        title: "T64 — Monitorar Métricas 80/20 | P1",
        priority: "P1",
        complexity: "low",
        destination: { tab: "structure", label: "Métricas" },
        subtasks: [
          "Atualizar indicadores principais.",
          "Revisar números.",
          "Consolidar desempenho.",
        ],
      },
      {
        code: "T65",
        legacyCodes: ["11.04"],
        title: "T65 — Monitorar Distribuição de Mídia | P2",
        priority: "P2",
        complexity: "low",
        destination: { tab: "structure", label: "Redes Sociais" },
        subtasks: [
          "Configurar redes e indicadores.",
          "Habilitar Criafy quando necessário.",
          "Verificar publicações, agendamentos e métricas.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 12 — BIBLIOTECA E BACKUP
  // =========================================================================
  {
    code: "ETAPA-12",
    title: "ETAPA 12 — BIBLIOTECA E BACKUP",
    position: 11,
    priority: "P1",
    tasks: [
      {
        code: "T66",
        legacyCodes: ["12.01"],
        title: "T66 — Configurar Biblioteca de Conteúdo | P1",
        priority: "P1",
        complexity: "low",
        destination: { tab: "creatives", label: "Biblioteca" },
        subtasks: [
          "Configurar armazenamento e permissões.",
          "Testar upload e reprodução.",
          "Aprovar biblioteca.",
        ],
      },
      {
        code: "T67",
        legacyCodes: ["12.02"],
        title: "T67 — Configurar Scripts e Áudios | P1",
        priority: "P1",
        complexity: "low",
        destination: { tab: "scripts_and_audios", label: "Scripts e Áudios" },
        subtasks: [
          "Configurar solicitações e gravação.",
          "Testar armazenamento e player.",
          "Aprovar módulo.",
        ],
      },
      {
        code: "T68",
        legacyCodes: ["12.03"],
        title: "T68 — Organizar Backup Master | P1",
        priority: "P1",
        complexity: "low",
        subtasks: [
          "Organizar pastas e arquivos.",
          "Validar links e permissões.",
          "Consolidar backup.",
        ],
      },
      {
        code: "T69",
        legacyCodes: ["12.04"],
        title: "T69 — Revisar Entregas e Versões | P2",
        priority: "P2",
        complexity: "low",
        subtasks: [
          "Conferir arquivos e aprovações.",
          "Organizar versões.",
          "Validar integridade.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 13 — OTIMIZAÇÕES OPCIONAIS
  // =========================================================================
  {
    code: "ETAPA-13",
    title: "ETAPA 13 — OTIMIZAÇÕES OPCIONAIS",
    position: 12,
    priority: "P0",
    tasks: [
      {
        code: "T70",
        legacyCodes: ["13.01"],
        title: "T70 — Registrar Oportunidades | P0",
        priority: "P0",
        complexity: "low",
        subtasks: [
          "Registrar proposta e impacto.",
          "⏳ Solicitar aprovação.",
          "Incorporar somente se aprovada.",
        ],
      },
      {
        code: "T71",
        legacyCodes: ["13.02"],
        title: "T71 — Avaliar Monetização Antecipada | P0",
        priority: "P0",
        complexity: "low",
        subtasks: [
          "Avaliar Teste Aliança e ofertas.",
          "Avaliar checkout e comunicação.",
          "⏳ Aprovar ou arquivar hipótese.",
        ],
      },
    ],
  },
];

export const MASTER_STAGES_PVD = MASTER_STAGES_AJ027;

/**
 * Reconciliação inteligente do Kanban com o AJ-027.
 * Executa a simplificação mantendo conclusões reais, sessões de cronômetro e integridade total.
 */
export function reconcileWorkspaceWithAJ027(
  ws: Workspace,
  ctx: { actorName: string; nowIso: string }
): boolean {
  if (!ws || !ws.stages || !ws.tasks) return false;

  const sprintId = ws.activeSprintId || Object.keys(ws.sprints || {})[0];
  if (!sprintId) return false;

  let changed = false;

  // 1. Integridade de chaves
  if (!ws.subtasks) ws.subtasks = {};
  for (const [key, t] of Object.entries(ws.tasks)) {
    if (t && t.id && key !== t.id) {
      delete ws.tasks[key];
      ws.tasks[t.id] = t;
      changed = true;
    }
  }
  for (const [key, st] of Object.entries(ws.subtasks)) {
    if (st && st.id && key !== st.id) {
      delete ws.subtasks[key];
      ws.subtasks[st.id] = st;
      changed = true;
    }
  }

  // 2. Mapear estágios existentes do sprint
  const existingStages = Object.values(ws.stages).filter(
    (s) => !s.archivedAt && s.sprintId === sprintId
  );

  const stageIdMap = new Map<string, string>(); // code -> stageId
  const reconciledTaskIds = new Set<string>();

  // Processar 13 Etapas
  for (const stageDef of MASTER_STAGES_AJ027) {
    let matchedStage = existingStages.find((s) => {
      const sTitleUpper = s.title.toUpperCase();
      const codeUpper = stageDef.code.toUpperCase();
      const posStr = `ETAPA ${stageDef.position + 1 < 10 ? "0" : ""}${stageDef.position + 1}`;
      if (sTitleUpper.includes(posStr)) return true;
      if (sTitleUpper.includes(codeUpper)) return true;
      if (stageDef.code === "ETAPA-01" && (sTitleUpper.includes("INTELIGÊNCIA") || sTitleUpper.includes("MANUAL DE MARCA"))) return true;
      if (stageDef.code === "ETAPA-02" && sTitleUpper.includes("GRUPO DE CAPTAÇÃO") && !sTitleUpper.includes("AUTOMAÇÕES")) return true;
      if (stageDef.code === "ETAPA-03" && sTitleUpper.includes("AUTOMAÇÕES DO GRUPO")) return true;
      if (stageDef.code === "ETAPA-04" && sTitleUpper.includes("INSTAGRAM")) return true;
      if (stageDef.code === "ETAPA-05" && (sTitleUpper.includes("FUNIL COMERCIAL") || sTitleUpper.includes("CRM"))) return true;
      if (stageDef.code === "ETAPA-06" && sTitleUpper.includes("AQUISIÇÃO INICIAL")) return true;
      if (stageDef.code === "ETAPA-07" && sTitleUpper.includes("WEBINÁRIO") && !sTitleUpper.includes("PERFORMANCE")) return true;
      if (stageDef.code === "ETAPA-08" && sTitleUpper.includes("CAMPANHAS DE VALIDAÇÃO")) return true;
      if (stageDef.code === "ETAPA-09" && sTitleUpper.includes("DISTRIBUIÇÃO ORGÂNICA")) return true;
      if (stageDef.code === "ETAPA-10" && sTitleUpper.includes("REMARKETING")) return true;
      if (stageDef.code === "ETAPA-11" && (sTitleUpper.includes("DASHBOARD") || sTitleUpper.includes("PERFORMANCE"))) return true;
      if (stageDef.code === "ETAPA-12" && (sTitleUpper.includes("BIBLIOTECA") || sTitleUpper.includes("BACKUP"))) return true;
      if (stageDef.code === "ETAPA-13" && sTitleUpper.includes("OTIMIZAÇÕES")) return true;
      return false;
    });

    if (!matchedStage) {
      const stageId = newId();
      matchedStage = {
        ...base(ctx),
        id: stageId,
        sprintId,
        title: stageDef.title,
        position: stageDef.position,
      };
      ws.stages[stageId] = matchedStage;
      changed = true;
    } else {
      if (matchedStage.title !== stageDef.title) {
        matchedStage.title = stageDef.title;
        changed = true;
      }
      if (matchedStage.position !== stageDef.position) {
        matchedStage.position = stageDef.position;
        changed = true;
      }
    }

    stageIdMap.set(stageDef.code, matchedStage.id);
    const currentStageId = matchedStage.id;

    // 3. Processar Tarefas desta Etapa
    for (let taskIdx = 0; taskIdx < stageDef.tasks.length; taskIdx++) {
      const taskDef = stageDef.tasks[taskIdx];

      // Localizar tarefa existente
      let matchedTask = Object.values(ws.tasks).find((t) => {
        if (reconciledTaskIds.has(t.id)) return false;
        const titleUpper = t.title.toUpperCase();

        // 1. Match direto por código oficial T01-T71
        if (titleUpper.includes(taskDef.code)) return true;

        // 2. Match por códigos legados
        if (taskDef.legacyCodes) {
          for (const leg of taskDef.legacyCodes) {
            if (titleUpper.includes(leg)) return true;
          }
        }

        // 3. Match semântico por palavras-chave inequívocas
        if (taskDef.code === "T01" && titleUpper.includes("POSICIONAMENTO")) return true;
        if (taskDef.code === "T02" && titleUpper.includes("ALMA DA COPY")) return true;
        if (taskDef.code === "T03" && titleUpper.includes("RAIO X")) return true;
        if (taskDef.code === "T04" && titleUpper.includes("PERSONALIDADE")) return true;
        if (taskDef.code === "T05" && titleUpper.includes("COPY ADS")) return true;
        if (taskDef.code === "T06" && titleUpper.includes("MASTER PROMPT")) return true;
        if (taskDef.code === "T07" && (titleUpper.includes("ÁUDIOS") || titleUpper.includes("AUDIOS"))) return true;
        if (taskDef.code === "T08" && (titleUpper.includes("CONFIGURAR GRUPO") || titleUpper.includes("CRIAR GRUPO"))) return true;
        if (taskDef.code === "T09" && titleUpper.includes("CAPA DO GRUPO")) return true;
        if (taskDef.code === "T10" && titleUpper.includes("DESCRIÇÃO DO GRUPO")) return true;
        if (taskDef.code === "T11" && titleUpper.includes("SEQUÊNCIA DE COPIES")) return true;
        if (taskDef.code === "T12" && (titleUpper.includes("GRP-VID-01") || titleUpper.includes("MANHÃ"))) return true;
        if (taskDef.code === "T13" && (titleUpper.includes("GRP-VID-02") || titleUpper.includes("MEIO DO DIA"))) return true;
        if (taskDef.code === "T14" && (titleUpper.includes("GRP-VID-03") || titleUpper.includes("FINAL DO DIA"))) return true;
        if (taskDef.code === "T15" && titleUpper.includes("AUTO-01")) return true;
        if (taskDef.code === "T16" && titleUpper.includes("AUTO-02")) return true;
        if (taskDef.code === "T17" && titleUpper.includes("AUTO-03")) return true;
        if (taskDef.code === "T18" && titleUpper.includes("AUTO-04")) return true;
        if (taskDef.code === "T19" && titleUpper.includes("AUTO-05")) return true;
        if (taskDef.code === "T20" && titleUpper.includes("AUTO-06")) return true;
        if (taskDef.code === "T21" && (titleUpper.includes("VALIDAR OPERAÇÃO") || titleUpper.includes("TEST-01"))) return true;
        if (taskDef.code === "T22" && (titleUpper.includes("CONFIGURAR INSTAGRAM") || titleUpper.includes("PERFIL"))) return true;
        if (taskDef.code === "T23" && titleUpper.includes("DESTAQUE DO INSTAGRAM")) return true;
        if (taskDef.code === "T24" && titleUpper.includes("POST DE POSICIONAMENTO")) return true;
        if (taskDef.code === "T25" && titleUpper.includes("CARROSSEL")) return true;
        if (taskDef.code === "T26" && titleUpper.includes("STORY ESTÁTICO")) return true;
        if (taskDef.code === "T27" && (titleUpper.includes("META ADS") || titleUpper.includes("BM"))) return true;
        if (taskDef.code === "T28" && (titleUpper.includes("PRÉ-QUALIFICAÇÃO") || titleUpper.includes("PRE-QUALIFICACAO"))) return true;
        if (taskDef.code === "T29" && (titleUpper.includes("NEGOCIAÇÃO") || titleUpper.includes("NEGOCIACAO"))) return true;
        if (taskDef.code === "T30" && titleUpper.includes("SCRIPT DE VENDA")) return true;
        if (taskDef.code === "T31" && (titleUpper.includes("CONFIGURAR CRM") || titleUpper.includes("PIPELINE CRM"))) return true;
        if (taskDef.code === "T32" && titleUpper.includes("CONFIGURAR CHECKOUT")) return true;
        if (taskDef.code === "T33" && (titleUpper.includes("CRIATIVOS INICIAIS") || titleUpper.includes("AQ-01"))) return true;
        if (taskDef.code === "T34" && (titleUpper.includes("CONFIRMAR VERBA") || titleUpper.includes("ORÇAMENTO INICIAL"))) return true;
        if (taskDef.code === "T35" && (titleUpper.includes("ATIVAR AQUISIÇÃO") || titleUpper.includes("ATIVAR AQUISICAO"))) return true;
        if (taskDef.code === "T36" && (titleUpper.includes("DEFINIR WEBINÁRIO") || titleUpper.includes("BRIEFING DO WEBINÁRIO"))) return true;
        if (taskDef.code === "T37" && (titleUpper.includes("NOVE COPIES") || titleUpper.includes("COPIES DO WEBINÁRIO"))) return true;
        if (taskDef.code === "T38" && titleUpper.includes("WEB-A")) return true;
        if (taskDef.code === "T39" && titleUpper.includes("WEB-B")) return true;
        if (taskDef.code === "T40" && (titleUpper.includes("GOOGLE MEET") || titleUpper.includes("SALA DE TRANSMISSÃO"))) return true;
        if (taskDef.code === "T41" && titleUpper.includes("ESTAMOS AO VIVO")) return true;
        if (taskDef.code === "T42" && titleUpper.includes("ENCERROU")) return true;
        if (taskDef.code === "T43" && titleUpper.includes("CONVITES E CONFIRMAÇÕES")) return true;
        if (taskDef.code === "T44" && titleUpper.includes("VALIDAR WEBINÁRIO")) return true;
        if (taskDef.code === "T45" && (titleUpper.includes("QUATRO CAMPANHAS") || titleUpper.includes("MATRIZ DE CAMPANHAS"))) return true;
        if (taskDef.code === "T46" && (titleUpper.includes("C01") || titleUpper.includes("CONEXÃO E SOLUÇÃO"))) return true;
        if (taskDef.code === "T47" && (titleUpper.includes("C02") || titleUpper.includes("PROVAS E EVIDÊNCIAS"))) return true;
        if (taskDef.code === "T48" && (titleUpper.includes("C03") || titleUpper.includes("AUTORIDADE E RELEVÂNCIA"))) return true;
        if (taskDef.code === "T49" && (titleUpper.includes("BOI DE PIRANHA") || titleUpper.includes("BP-"))) return true;
        if (taskDef.code === "T50" && titleUpper.includes("ORÇAMENTO DAS CAMPANHAS")) return true;
        if (taskDef.code === "T51" && titleUpper.includes("MONITORAR CAMPANHAS")) return true;
        if (taskDef.code === "T52" && titleUpper.includes("FORMATO ORGÂNICO")) return true;
        if (taskDef.code === "T53" && titleUpper.includes("LOTE ORGÂNICO")) return true;
        if (taskDef.code === "T54" && (titleUpper.includes("PROGRAMAR PUBLICAÇÕES") || titleUpper.includes("CRIAFY"))) return true;
        if (taskDef.code === "T55" && titleUpper.includes("STORIES CORINGA")) return true;
        if (taskDef.code === "T56" && titleUpper.includes("NARRATIVA CORINGA")) return true;
        if (taskDef.code === "T57" && titleUpper.includes("RECUPERAÇÃO COMERCIAL")) return true;
        if (taskDef.code === "T58" && titleUpper.includes("AUTOMATIZAR REMARKETING")) return true;
        if (taskDef.code === "T59" && (titleUpper.includes("PRODUTO SECUNDÁRIO") || titleUpper.includes("DOWNSELL"))) return true;
        if (taskDef.code === "T60" && titleUpper.includes("COMUNIDADE RECORRENTE")) return true;
        if (taskDef.code === "T61" && titleUpper.includes("RELACIONAMENTO PASSIVO")) return true;
        if (taskDef.code === "T62" && titleUpper.includes("INDICADORES INFRA")) return true;
        if (taskDef.code === "T63" && titleUpper.includes("INDICADORES WEBINÁRIO")) return true;
        if (taskDef.code === "T64" && titleUpper.includes("MÉTRICAS 80/20")) return true;
        if (taskDef.code === "T65" && (titleUpper.includes("DISTRIBUIÇÃO DE MÍDIA") || titleUpper.includes("REDES SOCIAIS"))) return true;
        if (taskDef.code === "T66" && titleUpper.includes("BIBLIOTECA DE CONTEÚDO")) return true;
        if (taskDef.code === "T67" && titleUpper.includes("SCRIPTS E ÁUDIOS")) return true;
        if (taskDef.code === "T68" && titleUpper.includes("BACKUP MASTER")) return true;
        if (taskDef.code === "T69" && titleUpper.includes("REVISAR ENTREGAS")) return true;
        if (taskDef.code === "T70" && titleUpper.includes("OPORTUNIDADES")) return true;
        if (taskDef.code === "T71" && (titleUpper.includes("MONETIZAÇÃO ANTECIPADA") || titleUpper.includes("TESTE ALIANÇA"))) return true;

        return false;
      });

      if (!matchedTask) {
        matchedTask = makeTask(ctx, currentStageId, taskDef.title, taskIdx, {
          priority: taskDef.priority,
          complexity: taskDef.complexity,
          status: "pending",
        });
        ws.tasks[matchedTask.id] = matchedTask;
        changed = true;
      } else {
        // Preserva id, status, workSessions, assignees, mas atualiza título limpo oficial e prioridade
        if (matchedTask.archivedAt) {
          delete matchedTask.archivedAt;
          changed = true;
        }
        if (matchedTask.stageId !== currentStageId) {
          matchedTask.stageId = currentStageId;
          changed = true;
        }
        if (matchedTask.title !== taskDef.title) {
          matchedTask.title = taskDef.title;
          changed = true;
        }
        if (matchedTask.priority !== taskDef.priority) {
          matchedTask.priority = taskDef.priority;
          changed = true;
        }
        if (matchedTask.position !== taskIdx) {
          matchedTask.position = taskIdx;
          changed = true;
        }
      }

      reconciledTaskIds.add(matchedTask.id);

      // 4. Subtarefas da Tarefa (Apenas 2 a 5 itens objetivos por tarefa)
      const existingSubtasks = Object.values(ws.subtasks).filter(
        (st) => st.taskId === matchedTask!.id
      );

      const reconciledSubtaskIds = new Set<string>();

      for (let stIdx = 0; stIdx < taskDef.subtasks.length; stIdx++) {
        const subDefTitle = taskDef.subtasks[stIdx];

        // Tentar localizar subtarefa existente correspondente
        const matchedSub = existingSubtasks.find((st) => {
          if (reconciledSubtaskIds.has(st.id)) return false;
          const stTitleTrim = st.title.trim().toLowerCase();
          const defTitleTrim = subDefTitle.trim().toLowerCase();
          if (stTitleTrim === defTitleTrim) return true;

          // Match semântico por palavras chave
          const cleanDef = defTitleTrim.replace(/[^\w\s]/g, "");
          const cleanSt = stTitleTrim.replace(/[^\w\s]/g, "");
          const defWords = cleanDef.split(/\s+/).filter((w) => w.length > 4);
          if (defWords.length > 0 && defWords.every((w) => cleanSt.includes(w))) {
            return true;
          }
          return false;
        });

        if (!matchedSub) {
          // Cria nova subtarefa limpa
          const newSub = makeSubtask(ctx, matchedTask.id, subDefTitle, stIdx);
          ws.subtasks[newSub.id] = newSub;
          reconciledSubtaskIds.add(newSub.id);
          changed = true;
        } else {
          // Mantém id e o status done comprovado! Atualiza título e posição
          if (matchedSub.archivedAt) {
            delete matchedSub.archivedAt;
            changed = true;
          }
          if (matchedSub.title !== subDefTitle) {
            matchedSub.title = subDefTitle;
            changed = true;
          }
          if (matchedSub.position !== stIdx) {
            matchedSub.position = stIdx;
            changed = true;
          }
          reconciledSubtaskIds.add(matchedSub.id);
        }
      }

      // Arquivar subtarefas antigas redundantes que não pertencem ao novo checklist enxuto
      for (const st of existingSubtasks) {
        if (!reconciledSubtaskIds.has(st.id) && !st.archivedAt) {
          st.archivedAt = ctx.nowIso;
          changed = true;
        }
      }
    }
  }

  // 5. Arquivar tarefas redundantes do sprint que não fazem parte do checklist canônico de 71 tarefas
  const currentSprintStageIds = new Set(stageIdMap.values());
  for (const t of Object.values(ws.tasks)) {
    if (t.stageId && currentSprintStageIds.has(t.stageId) && !reconciledTaskIds.has(t.id) && !t.archivedAt) {
      t.archivedAt = ctx.nowIso;
      changed = true;
    }
  }

  if (changed) {
    touch(ws.project, ctx);
    log(
      ws,
      ctx,
      "reconcile",
      "master_checklist",
      "pvd",
      "Checklist Master AJ-027 simplificado e reconciliado com sucesso (71 tarefas operacionais)"
    );
  }

  return changed;
}

/**
 * Backward compatibility alias para chamadas de reconciliação existentes
 */
export const reconcileWorkspaceWithAJ024 = reconcileWorkspaceWithAJ027;

/**
 * Helper para identificar o destino de navegação rápida a partir do título da tarefa ou subtarefa
 */
export function getTaskDestination(title: string): NavigationTarget | null {
  const upper = title.toUpperCase();

  if (upper.includes("POSICIONAMENTO")) {
    return { tab: "brand_manual", moduleId: "posicionamento", label: "Manual de Marca" };
  }
  if (upper.includes("ALMA DA COPY")) {
    return { tab: "brand_manual", moduleId: "alma_copy", label: "Manual de Marca" };
  }
  if (upper.includes("RAIO X")) {
    return { tab: "brand_manual", moduleId: "raio_x_icp", label: "Manual de Marca" };
  }
  if (upper.includes("PERSONALIDADE")) {
    return { tab: "brand_manual", moduleId: "personalidade", label: "Manual de Marca" };
  }
  if (upper.includes("MANUAL DE MARCA")) {
    return { tab: "brand_manual", moduleId: "posicionamento", label: "Manual de Marca" };
  }
  if (upper.includes("ÁUDIOS") || upper.includes("AUDIOS") || upper.includes("SCRIPTS E ÁUDIOS")) {
    return { tab: "scripts_and_audios", label: "Scripts e Áudios" };
  }
  if (
    upper.includes("CRIATIVOS") ||
    upper.includes("COPY ADS") ||
    upper.includes("GRP-VID") ||
    upper.includes("WEB-A") ||
    upper.includes("WEB-B") ||
    upper.includes("DESTAQUE") ||
    upper.includes("POST DE POSICIONAMENTO") ||
    upper.includes("CARROSSEL") ||
    upper.includes("STORY ESTÁTICO") ||
    upper.includes("LOTE ORGÂNICO") ||
    upper.includes("STORIES CORINGA") ||
    upper.includes("BIBLIOTECA")
  ) {
    return { tab: "creatives", label: "Criativos" };
  }
  if (
    upper.includes("CRM") ||
    upper.includes("PRÉ-QUALIFICAÇÃO") ||
    upper.includes("PRE-QUALIFICACAO") ||
    upper.includes("NEGOCIAÇÃO") ||
    upper.includes("NEGOCIACAO") ||
    upper.includes("SCRIPT DE VENDA") ||
    upper.includes("CHECKOUT") ||
    upper.includes("RECUPERAÇÃO COMERCIAL") ||
    upper.includes("PALAVRAS-CHAVE")
  ) {
    return { tab: "funnel", label: "CRM / Funil" };
  }
  if (upper.includes("WEBINÁRIO") || upper.includes("WEBINARIO") || upper.includes("GOOGLE MEET")) {
    return { tab: "structure", label: "Webinário" };
  }
  if (
    upper.includes("DASHBOARD") ||
    upper.includes("INFRA") ||
    upper.includes("MÉTRICAS") ||
    upper.includes("REDES SOCIAIS")
  ) {
    return { tab: "structure", label: "Cockpit" };
  }

  return null;
}
