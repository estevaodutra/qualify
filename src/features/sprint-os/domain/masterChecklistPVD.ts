/**
 * AJ-024 — CHECKLIST MASTER COMPLETO DO KANBAN PVD
 *
 * Estrutura: ETAPA → TAREFA → SUBTAREFA
 * 13 Etapas completas, tarefas individualizadas com códigos, prioridades e checklists operacionais.
 * Função de reconciliação inteligente que preserva registros existentes, status, sessões de cronômetro e subtarefas já concluídas.
 */

import type {
  Workspace,
  Stage,
  Task,
  Subtask,
  Priority,
  Complexity,
  ID,
} from "./types";
import {
  base,
  newId,
  makeTask,
  makeSubtask,
  touch,
  log,
  subtasksOf,
} from "./ops";

export interface MasterTaskDefinition {
  code: string;
  title: string;
  priority: Priority;
  complexity: Complexity;
  financialImpact?: boolean;
  durationMinutes?: number;
  subtasks: string[];
}

export interface MasterStageDefinition {
  code: string;
  title: string;
  position: number;
  priority: Priority;
  tasks: MasterTaskDefinition[];
}

export const MASTER_STAGES_PVD: MasterStageDefinition[] = [
  // =========================================================================
  // ETAPA 01 — INTELIGÊNCIA E MANUAL DE MARCA
  // =========================================================================
  {
    code: "ETAPA-01",
    title: "ETAPA 01 — INTELIGÊNCIA E MANUAL DE MARCA",
    position: 0,
    priority: "P1",
    tasks: [
      {
        code: "01.01",
        title: "TAREFA 01.01 — ⏳ PREENCHER POSICIONAMENTO",
        priority: "P1",
        complexity: "medium",
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "⏳ POS-01 — Responder: O que você vende e como isso melhora, na prática, a vida de quem compra?",
          "⏳ POS-02 — Responder: O que você faz de diferente para produzir esse resultado?",
          "⏳ POS-03 — Responder: O que muda no dia a dia do cliente depois que utiliza sua solução?",
          "⏳ POS-04 — Responder: O que as pessoas costumam fazer para resolver esse problema que você considera errado ou insuficiente?",
          "Confirmar salvamento das quatro respostas.",
          "Revisar transcrições, quando houver.",
          "Identificar respostas insuficientes.",
          "⏳ Solicitar complementações específicas, quando necessárias.",
          "Executar análise de posicionamento.",
          "Revisar tese central.",
          "Revisar promessa e transformação.",
          "Revisar mecanismo e diferencial.",
          "Revisar narrativa e identidade.",
          "Verificar se todas as afirmações estão fundamentadas.",
          "⏳ Solicitar aprovação da análise.",
          "Salvar versão aprovada.",
        ],
      },
      {
        code: "01.02",
        title: "TAREFA 01.02 — ⏳ PREENCHER ALMA DA COPY",
        priority: "P1",
        complexity: "medium",
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "⏳ ALM-01 — Responder: Que situação fez você perceber que essa solução precisava existir?",
          "⏳ ALM-02 — Responder: O que o cliente deixa de fazer ou passa a fazer depois de comprar?",
          "⏳ ALM-03 — Responder: Além do resultado principal, o que essa mudança permite que o cliente faça ou viva?",
          "Confirmar as três respostas.",
          "Revisar transcrições.",
          "Executar motor de Extração da Alma do Produto.",
          "Identificar dor-mãe.",
          "Identificar desejo-mãe.",
          "Identificar inimigo e brecha.",
          "Identificar transformação-mãe.",
          "Identificar crença central.",
          "Consolidar narrativa do produto.",
          "Gerar territórios e ângulos de comunicação.",
          "Revisar coerência e concretude.",
          "⏳ Solicitar complementações necessárias.",
          "Aprovar análise final.",
          "Salvar versão.",
        ],
      },
      {
        code: "01.03",
        title: "TAREFA 01.03 — ⏳ PREENCHER RAIO X DO ICP",
        priority: "P1",
        complexity: "medium",
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "⏳ ICP-01 — Responder: Por que seu cliente precisa do produto?",
          "⏳ ICP-02 — Responder: O que muda depois que ele utiliza o produto?",
          "⏳ ICP-03 — Responder: Quando o problema acontece, o que ele faz, pensa ou fala?",
          "Confirmar respostas.",
          "Revisar transcrições.",
          "Executar análise do Raio X.",
          "Consolidar ICP comportamental.",
          "Identificar situações reais.",
          "Identificar dor visível e problema real.",
          "Identificar pensamentos e falas.",
          "Identificar emoções predominantes.",
          "Organizar fragmentos da rotina.",
          "Identificar tentativas anteriores.",
          "Gerar cenas aplicáveis a anúncios.",
          "Gerar banco de hooks e headlines.",
          "Revisar inferências e hipóteses.",
          "Aprovar análise.",
          "Salvar versão final.",
        ],
      },
      {
        code: "01.04",
        title: "TAREFA 01.04 — ⏳ PREENCHER PERSONALIDADE",
        priority: "P1",
        complexity: "medium",
        financialImpact: true,
        durationMinutes: 90,
        subtasks: [
          "⏳ PER-01 — Vícios de linguagem.",
          "⏳ PER-02 — Gírias e dialetos.",
          "⏳ PER-03 — Frases e expressões próprias.",
          "⏳ PER-04 — Frases quebradas e construção verbal.",
          "⏳ PER-05 — Maneira de explicar.",
          "⏳ PER-06 — Humor e intensidade.",
          "⏳ PER-07 — Palavras que nunca usaria.",
          "⏳ PER-08 — Exemplos reais de fala.",
          "Confirmar respostas recebidas.",
          "Revisar áudios e transcrições.",
          "Identificar vocabulário recorrente.",
          "Identificar estilo de argumentação.",
          "Identificar expressões naturais.",
          "Consolidar tom de voz.",
          "Validar linguagem com o expert.",
          "Salvar análise aprovada.",
        ],
      },
      {
        code: "01.05",
        title: "TAREFA 01.05 — GERAR DEZ VARIANTES DE COPY ADS",
        priority: "P1",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 180,
        subtasks: [
          "Consultar Posicionamento.",
          "Consultar Alma da Copy.",
          "Consultar Raio X do ICP.",
          "Consultar Personalidade.",
          "Confirmar produto e mecanismo.",
          "Confirmar CTA principal.",
          "Identificar lacunas relevantes.",
          "ADS-COPY-01 — Gerar Headline + Subheadline: rotina do ICP.",
          "ADS-COPY-02 — Gerar Headline + Subheadline: dor concreta.",
          "ADS-COPY-03 — Gerar Headline + Subheadline: pensamento oculto.",
          "ADS-COPY-04 — Gerar Headline + Subheadline: desejo e transformação.",
          "ADS-COPY-05 — Gerar Headline + Subheadline: contraste antes/depois.",
          "ADS-COPY-06 — Gerar Headline + Subheadline: erro ou crença antiga.",
          "ADS-COPY-07 — Gerar Headline + Subheadline: mecanismo.",
          "ADS-COPY-08 — Gerar Headline + Subheadline: prova e autoridade.",
          "ADS-COPY-09 — Gerar Headline + Subheadline: objeção.",
          "ADS-COPY-10 — Gerar Headline + Subheadline: convite.",
          "Revisar as dez headlines.",
          "Revisar as dez subheadlines.",
          "Verificar diferenças reais entre os ângulos.",
          "Remover frases genéricas.",
          "Verificar naturalidade da linguagem.",
          "Remover afirmações não comprovadas.",
          "⏳ Solicitar aprovação das variantes selecionadas.",
          "Salvar versões aprovadas.",
          "Disponibilizar na aba Criativos.",
        ],
      },
      {
        code: "01.06",
        title: "TAREFA 01.06 — CONSOLIDAR MASTER PROMPT",
        priority: "P1",
        complexity: "medium",
        financialImpact: true,
        durationMinutes: 90,
        subtasks: [
          "Recuperar versão aprovada do Posicionamento.",
          "Recuperar versão aprovada da Alma da Copy.",
          "Recuperar versão aprovada do Raio X.",
          "Recuperar versão aprovada de Personalidade.",
          "Recuperar variantes aprovadas de Copy ADS.",
          "Consolidar ICP.",
          "Consolidar narrativa.",
          "Consolidar mecanismo.",
          "Consolidar transformação.",
          "Consolidar linguagem natural.",
          "Consolidar evidências.",
          "Registrar restrições e informações pendentes.",
          "Gerar arquivo Markdown.",
          "Revisar instruções de produção de headlines, hooks, corpo e CTA.",
          "⏳ Solicitar aprovação.",
          "Salvar versão final no Backup Master.",
        ],
      },
      {
        code: "01.07",
        title: "TAREFA 01.07 — ⏳ COLETAR SCRIPTS E ÁUDIOS DE REFERÊNCIA",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "Criar solicitação de áudio sobre a solução.",
          "Criar solicitação de áudio sobre o mecanismo.",
          "Criar solicitação de explicação espontânea.",
          "Definir contexto de cada solicitação.",
          "Escrever roteiro de apoio.",
          "⏳ Atribuir responsável.",
          "⏳ Receber gravações.",
          "Confirmar hospedagem interna.",
          "Testar reprodução.",
          "Transcrever quando o serviço estiver disponível.",
          "Revisar transcrições.",
          "Vincular material às perguntas correspondentes.",
          "Salvar os áudios aprovados na biblioteca.",
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
        code: "02.01",
        title: "TAREFA 02.01 — CRIAR E CONFIGURAR GRUPO",
        priority: "P1",
        complexity: "low",
        durationMinutes: 60,
        subtasks: [
          "Definir nome do grupo.",
          "Criar grupo na plataforma definida.",
          "Configurar administradores.",
          "Revisar permissões de participantes.",
          "Configurar informações básicas.",
          "Gerar link de convite.",
          "Testar abertura do link.",
          "Testar entrada de participante.",
          "Registrar link oficial.",
          "Vincular grupo ao sistema operacional.",
          "Registrar dados no Backup Master.",
        ],
      },
      {
        code: "02.02",
        title: "TAREFA 02.02 — ⏳ PRODUZIR CAPA DO GRUPO",
        priority: "P1",
        complexity: "low",
        durationMinutes: 60,
        subtasks: [
          "Definir texto principal da capa.",
          "Definir orientação visual.",
          "Vincular identidade de marca.",
          "Criar briefing para designer.",
          "⏳ Atribuir criação.",
          "⏳ Receber arte.",
          "Conferir dimensões.",
          "Conferir legibilidade em miniatura.",
          "Revisar composição visual.",
          "⏳ Solicitar ajustes, se necessários.",
          "⏳ Aprovar capa.",
          "Fazer upload do arquivo final.",
          "Aplicar capa no grupo.",
          "Conferir exibição no aplicativo.",
        ],
      },
      {
        code: "02.03",
        title: "TAREFA 02.03 — CRIAR DESCRIÇÃO DO GRUPO",
        priority: "P1",
        complexity: "low",
        durationMinutes: 45,
        subtasks: [
          "Definir propósito do grupo.",
          "Escrever descrição principal.",
          "Explicar o que o participante encontrará.",
          "Informar orientação inicial.",
          "Definir CTA ou ação esperada.",
          "Revisar clareza.",
          "⏳ Solicitar aprovação.",
          "Inserir descrição.",
          "Validar formatação.",
          "Salvar texto aprovado.",
        ],
      },
      {
        code: "02.04",
        title: "TAREFA 02.04 — CRIAR SEQUÊNCIA DE COPIES DO GRUPO",
        priority: "P1",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 180,
        subtasks: [
          "Criar mensagem de boas-vindas.",
          "Criar mensagem de contextualização.",
          "Criar orientação de participação.",
          "Definir CTA da entrada.",
          "Criar copy de abertura da manhã.",
          "Criar texto de apoio ao vídeo GRP-VID-01.",
          "Criar CTA de levantamento de mão.",
          "Definir ordem de apresentação dos materiais.",
          "Identificar intervalos pendentes de confirmação.",
          "Criar copy de prova/estudo de caso.",
          "Confirmar a evidência utilizada.",
          "Criar texto de apoio ao vídeo GRP-VID-02.",
          "Criar levantamento de mão.",
          "Registrar horário confirmado quando disponível.",
          "Criar copy do conteúdo final.",
          "Criar texto de apoio ao vídeo GRP-VID-03.",
          "Criar levantamento de mão.",
          "Registrar horário confirmado quando disponível.",
          "Revisar coerência da sequência.",
          "Revisar links e CTAs.",
          "Verificar horários informados.",
          "⏳ Solicitar aprovação das copies.",
          "Salvar cada copy individualmente.",
          "Vincular às automações correspondentes.",
        ],
      },
      {
        code: "02.05",
        title: "TAREFA 02.05 — ⏳ PRODUZIR VÍDEO GRP-VID-01 — DESTAQUE DA MANHÃ",
        priority: "P1",
        complexity: "medium",
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "Definir objetivo do vídeo.",
          "Definir tema.",
          "Criar headline.",
          "Criar hook.",
          "Criar corpo.",
          "Criar CTA interativo.",
          "Consolidar roteiro.",
          "⏳ Solicitar aprovação do roteiro.",
          "Criar solicitação na aba Scripts e Áudios, se necessária.",
          "⏳ Atribuir gravação.",
          "⏳ Receber vídeo bruto.",
          "⏳ Providenciar edição.",
          "Receber vídeo editado.",
          "Fazer upload na aba Criativos.",
          "Testar reprodução.",
          "⏳ Aprovar versão final.",
          "Vincular GRP-VID-01 ao AUTO-02.",
        ],
      },
      {
        code: "02.06",
        title: "TAREFA 02.06 — ⏳ PRODUZIR VÍDEO GRP-VID-02 — MEIO DO DIA",
        priority: "P1",
        complexity: "medium",
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "Definir conteúdo de prova ou estudo de caso.",
          "Confirmar que a evidência é real.",
          "Criar headline.",
          "Criar hook.",
          "Criar corpo.",
          "Criar CTA.",
          "Consolidar roteiro.",
          "⏳ Aprovar roteiro.",
          "⏳ Atribuir gravação.",
          "⏳ Receber material bruto.",
          "⏳ Editar.",
          "Fazer upload final.",
          "Testar reprodução.",
          "⏳ Aprovar vídeo.",
          "Vincular GRP-VID-02 ao AUTO-03.",
        ],
      },
      {
        code: "02.07",
        title: "TAREFA 02.07 — ⏳ PRODUZIR VÍDEO GRP-VID-03 — FINAL DO DIA",
        priority: "P1",
        complexity: "medium",
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "Definir tema do período.",
          "Definir situação real abordada.",
          "Criar headline.",
          "Criar hook.",
          "Criar corpo.",
          "Criar CTA de interação.",
          "Consolidar roteiro.",
          "⏳ Aprovar roteiro.",
          "⏳ Gravar.",
          "⏳ Editar.",
          "Fazer upload.",
          "Conferir arquivo.",
          "⏳ Aprovar vídeo.",
          "Vincular GRP-VID-03 ao AUTO-04.",
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
        code: "03.01",
        title: "TAREFA 03.01 — AUTOMATIZAR AUTO-01 — ENTRADA NO GRUPO",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Identificar grupo correto.",
          "Confirmar suporte técnico ao evento de entrada.",
          "Selecionar copy de boas-vindas aprovada.",
          "Configurar gatilho.",
          "Configurar envio de mensagem inicial.",
          "Vincular CTA.",
          "Testar com participante de teste.",
          "Confirmar mensagem recebida.",
          "Validar execução única.",
          "Registrar resultado.",
          "Aprovar fluxo.",
        ],
      },
      {
        code: "03.02",
        title: "TAREFA 03.02 — AUTOMATIZAR AUTO-02 — ENVIO DA MANHÃ",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "Selecionar grupo de destino.",
          "Vincular copy da manhã.",
          "Vincular GRP-VID-01 aprovado.",
          "Vincular levantamento de mão da manhã.",
          "Configurar disparo principal para 08h00.",
          "Registrar sequência interna aprovada.",
          "Confirmar intervalos necessários.",
          "Configurar intervalos confirmados.",
          "Testar recebimento do texto.",
          "Testar recebimento do vídeo.",
          "Testar reprodução.",
          "Testar CTA e interação.",
          "Verificar duplicidades.",
          "Registrar evidência do teste.",
          "Aprovar fluxo.",
        ],
      },
      {
        code: "03.03",
        title: "TAREFA 03.03 — AUTOMATIZAR AUTO-03 — MEIO DO DIA",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "⏳ Confirmar horário do envio principal.",
          "Registrar horário no card e no fluxo.",
          "Vincular copy de prova.",
          "Vincular GRP-VID-02 aprovado.",
          "Vincular levantamento de mão.",
          "Registrar sequência dos três materiais.",
          "Confirmar intervalos.",
          "Configurar disparo.",
          "Testar mensagem.",
          "Testar vídeo.",
          "Testar CTA.",
          "Verificar ausência de duplicidade.",
          "Registrar teste.",
          "Aprovar fluxo.",
        ],
      },
      {
        code: "03.04",
        title: "TAREFA 03.04 — AUTOMATIZAR AUTO-04 — FINAL DO DIA",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "⏳ Confirmar horário do envio principal.",
          "Registrar horário.",
          "Vincular copy final.",
          "Vincular GRP-VID-03 aprovado.",
          "Vincular levantamento de mão final.",
          "Registrar sequência.",
          "Confirmar intervalos.",
          "Configurar disparo.",
          "Testar texto.",
          "Testar vídeo.",
          "Testar CTA.",
          "Verificar execução.",
          "Registrar resultado.",
          "Aprovar fluxo.",
        ],
      },
      {
        code: "03.05",
        title: "TAREFA 03.05 — AUTOMATIZAR AUTO-05 — PALAVRAS-CHAVE",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "Confirmar palavras-chave aprovadas.",
          "Cadastrar palavra-chave.",
          "Vincular resposta correspondente.",
          "Configurar condição de acionamento.",
          "Definir próximo passo comercial.",
          "Vincular etapa de CRM.",
          "Configurar encaminhamento.",
          "Testar palavra-chave válida.",
          "Testar texto que não deve acionar o fluxo.",
          "Verificar mensagens duplicadas.",
          "Registrar evidência.",
          "Aprovar fluxo.",
        ],
      },
      {
        code: "03.06",
        title: "TAREFA 03.06 — AUTOMATIZAR AUTO-06 — SAÍDA DO GRUPO",
        priority: "P1",
        complexity: "low",
        durationMinutes: 45,
        subtasks: [
          "Confirmar suporte ao evento.",
          "Definir estado do contato após a saída.",
          "Configurar atualização.",
          "Configurar bloqueio de envios indevidos.",
          "Testar saída, quando suportada.",
          "Verificar atualização do contato.",
          "Registrar resultado.",
          "Aprovar fluxo.",
        ],
      },
      {
        code: "03.07",
        title: "TAREFA 03.07 — TESTAR OPERAÇÃO COMPLETA DO GRUPO",
        priority: "P1",
        complexity: "high",
        durationMinutes: 120,
        subtasks: [
          "Testar entrada de participante.",
          "Testar link de convite.",
          "Testar mensagem inicial.",
          "Testar fluxo da manhã — 08h00.",
          "Testar fluxo do meio do dia.",
          "Testar fluxo do final do dia.",
          "Testar GRP-VID-01.",
          "Testar GRP-VID-02.",
          "Testar GRP-VID-03.",
          "Testar os levantamentos de mão.",
          "Testar palavras-chave.",
          "Testar condições de saída suportadas.",
          "Registrar falhas.",
          "Corrigir falhas.",
          "Repetir testes afetados.",
          "⏳ Solicitar aprovação final.",
          "Liberar operação.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 04 — INSTAGRAM E INFRAESTRUTURA DE AQUISIÇÃO
  // =========================================================================
  {
    code: "ETAPA-04",
    title: "ETAPA 04 — INSTAGRAM E INFRAESTRUTURA DE AQUISIÇÃO",
    position: 3,
    priority: "P1",
    tasks: [
      {
        code: "04.01",
        title: "TAREFA 04.01 — CONFIGURAR PERFIL DO INSTAGRAM",
        priority: "P1",
        complexity: "low",
        durationMinutes: 60,
        subtasks: [
          "Validar acesso ao perfil.",
          "Confirmar dados básicos.",
          "Criar bio a partir do posicionamento aprovado.",
          "⏳ Aprovar bio.",
          "Aplicar bio.",
          "Criar ou selecionar link de captação.",
          "Vincular link à bio.",
          "Testar redirecionamento.",
          "Conferir visualização no celular.",
          "Registrar dados de acesso necessários de modo seguro.",
        ],
      },
      {
        code: "04.02",
        title: "TAREFA 04.02 — ⏳ PRODUZIR DESTAQUE DO INSTAGRAM",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "Definir objetivo do destaque.",
          "Definir nome.",
          "Criar roteiro do conteúdo.",
          "Criar capa.",
          "⏳ Solicitar mídias necessárias.",
          "Montar sequência de stories.",
          "Inserir CTA.",
          "⏳ Aprovar.",
          "Publicar.",
          "Conferir sequência.",
          "Testar destino.",
        ],
      },
      {
        code: "04.03",
        title: "TAREFA 04.03 — PRODUZIR POST DE POSICIONAMENTO",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Definir objetivo.",
          "Criar headline.",
          "Criar corpo da legenda.",
          "Criar CTA.",
          "Criar briefing visual.",
          "⏳ Produzir arte.",
          "⏳ Aprovar.",
          "Publicar.",
          "Conferir exibição.",
        ],
      },
      {
        code: "04.04",
        title: "TAREFA 04.04 — PRODUZIR CARROSSEL",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "Definir tema.",
          "Criar headline da capa.",
          "Escrever sequência dos slides.",
          "Criar slide final com CTA.",
          "⏳ Produzir design.",
          "Revisar.",
          "⏳ Aprovar.",
          "Publicar.",
          "Conferir slides.",
        ],
      },
      {
        code: "04.05",
        title: "TAREFA 04.05 — PRODUZIR STORY ESTÁTICO",
        priority: "P1",
        complexity: "low",
        durationMinutes: 45,
        subtasks: [
          "Definir mensagem.",
          "Criar headline.",
          "Criar apoio textual.",
          "Definir CTA.",
          "⏳ Produzir arte.",
          "⏳ Aprovar.",
          "Publicar.",
          "Testar link.",
        ],
      },
      {
        code: "04.06",
        title: "TAREFA 04.06 — CONFIGURAR INFRAESTRUTURA META ADS",
        priority: "P1",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "Verificar BM.",
          "Verificar conta de anúncios.",
          "Verificar permissões.",
          "Vincular perfil do Instagram.",
          "Confirmar página vinculada, quando necessária.",
          "Verificar restrições existentes.",
          "⏳ Confirmar cartão/meio de pagamento.",
          "Verificar disponibilidade de orçamento.",
          "Confirmar destino dos anúncios.",
          "Configurar rastreamento disponível.",
          "Realizar teste de configuração.",
          "Registrar liberação da infraestrutura.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 05 — FUNIL COMERCIAL, CRM E CHECKOUT
  // =========================================================================
  {
    code: "ETAPA-05",
    title: "ETAPA 05 — FUNIL COMERCIAL, CRM E CHECKOUT",
    position: 4,
    priority: "P1",
    tasks: [
      {
        code: "05.01",
        title: "TAREFA 05.01 — CRIAR SCRIPT DE PRÉ-QUALIFICAÇÃO",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "Definir entrada do atendimento.",
          "Criar mensagem de abertura.",
          "Criar primeira pergunta de identificação.",
          "Criar perguntas de contexto.",
          "Criar minipromessa.",
          "Definir utilização do Teste Aliança, quando aprovado.",
          "Criar encaminhamento para próximo estágio.",
          "Definir condições de avanço.",
          "Criar tratamento para respostas incompletas.",
          "⏳ Aprovar script.",
          "Testar conversa completa.",
          "Vincular ao CRM.",
        ],
      },
      {
        code: "05.02",
        title: "TAREFA 05.02 — CRIAR SCRIPT DE NEGOCIAÇÃO",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "Identificar objeções prioritárias.",
          "Criar pergunta de prioridade.",
          "Criar pergunta de disponibilidade.",
          "Criar abordagem de investimento.",
          "Criar resposta para objeção de preço.",
          "Criar resposta para objeção de tempo.",
          "Criar resposta para insegurança.",
          "Definir próximo passo.",
          "⏳ Aprovar script.",
          "Testar simulações.",
          "Vincular ao CRM.",
        ],
      },
      {
        code: "05.03",
        title: "TAREFA 05.03 — CRIAR SCRIPT DE VENDA",
        priority: "P1",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 90,
        subtasks: [
          "Confirmar oferta.",
          "Confirmar benefícios e entregáveis.",
          "Confirmar preço atual.",
          "Validar eventual ancoragem de R$ 120.",
          "Validar eventual condição de R$ 69.",
          "Criar apresentação do workshop.",
          "Criar argumento principal.",
          "Criar CTA de pagamento.",
          "Criar mensagem com link.",
          "Criar mensagem de confirmação.",
          "⏳ Aprovar script e condições.",
          "Testar fluxo até o checkout.",
        ],
      },
      {
        code: "05.04",
        title: "TAREFA 05.04 — CONFIGURAR PIPELINE COMERCIAL",
        priority: "P1",
        complexity: "high",
        durationMinutes: 120,
        subtasks: [
          "Criar ou validar EM ABERTO.",
          "Criar ou validar PRÉ-QUALIFICAÇÃO.",
          "Criar ou validar INTERESSADO.",
          "Criar ou validar NEGOCIAÇÃO.",
          "Criar ou validar FOLLOW-UP.",
          "Criar ou validar VENDA.",
          "Definir critérios de movimentação.",
          "Definir responsáveis.",
          "Vincular mensagens.",
          "Vincular automações.",
          "Testar criação de lead.",
          "Testar transferência entre etapas.",
          "Testar atribuição.",
          "Testar registro de venda.",
          "Corrigir inconsistências.",
          "Aprovar pipeline.",
        ],
      },
      {
        code: "05.05",
        title: "TAREFA 05.05 — CONFIGURAR CHECKOUT",
        priority: "P1",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 90,
        subtasks: [
          "⏳ Confirmar produto.",
          "⏳ Confirmar preço.",
          "⏳ Confirmar condições.",
          "Criar ou selecionar produto na plataforma.",
          "Configurar checkout.",
          "Configurar dados solicitados ao comprador.",
          "Configurar destino após pagamento.",
          "Validar link.",
          "Testar pagamento conforme recursos disponíveis.",
          "Testar confirmação de compra.",
          "Testar registro da venda.",
          "Salvar link no Backup Master.",
          "Aprovar operação.",
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
        code: "06.01",
        title: "TAREFA 06.01 — ORGANIZAR TRÊS CRIATIVOS INICIAIS",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 120,
        subtasks: [
          "Criar registro AQ-01.",
          "Criar registro AQ-02.",
          "Criar registro AQ-03.",
          "Identificar arquivos existentes reutilizáveis.",
          "Definir objetivo de cada material.",
          "Criar scripts ausentes.",
          "⏳ Aprovar roteiros necessários.",
          "⏳ Solicitar gravações pendentes.",
          "⏳ Providenciar edição.",
          "Fazer upload dos materiais finais.",
          "Testar reprodução.",
          "⏳ Aprovar os três criativos.",
        ],
      },
      {
        code: "06.02",
        title: "TAREFA 06.02 — ⏳ CONFIRMAR ORÇAMENTO DE ATIVAÇÃO",
        priority: "P1",
        complexity: "low",
        financialImpact: true,
        durationMinutes: 30,
        subtasks: [
          "Definir orçamento inicial.",
          "Identificar responsável financeiro.",
          "⏳ Solicitar aprovação.",
          "⏳ Confirmar verba.",
          "Verificar meio de pagamento.",
          "Registrar autorização.",
        ],
      },
      {
        code: "06.03",
        title: "TAREFA 06.03 — PUBLICAR E IMPULSIONAR",
        priority: "P1",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 90,
        subtasks: [
          "Publicar AQ-01.",
          "Publicar AQ-02.",
          "Publicar AQ-03.",
          "Confirmar destino do tráfego.",
          "Configurar impulsionamentos ou campanhas conforme planejamento.",
          "Aplicar referência de R$ 6,90 por impulsionamento somente quando compatível com a plataforma e a verba aprovada.",
          "Conferir criativo e copy.",
          "Verificar rastreamento.",
          "Ativar anúncios.",
          "Confirmar entrega.",
          "Registrar investimento.",
          "Registrar entradas no grupo.",
          "Identificar problemas de ativação.",
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
        code: "07.01",
        title: "TAREFA 07.01 — ⏳ DEFINIR BRIEFING DO EVENTO",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "⏳ Confirmar promessa.",
          "⏳ Confirmar público.",
          "⏳ Confirmar três pilares.",
          "⏳ Informar histórias relevantes.",
          "⏳ Disponibilizar evidências reais.",
          "⏳ Confirmar conteúdo a apresentar.",
          "⏳ Confirmar disponibilidade para o evento.",
          "Definir estrutura da apresentação.",
          "Revisar narrativa.",
          "⏳ Aprovar briefing.",
        ],
      },
      {
        code: "07.02",
        title: "TAREFA 07.02 — CRIAR NOVE COPIES DO WEBINÁRIO",
        priority: "P1",
        complexity: "high",
        durationMinutes: 180,
        subtasks: [
          "WEB-COPY-01 — Antecipação / manhã — ⏳ horário a confirmar.",
          "WEB-COPY-02 — Antecipação / tarde — ⏳ horário a confirmar.",
          "WEB-COPY-03 — Antecipação / noite — ⏳ horário a confirmar.",
          "WEB-COPY-04 — Dia do evento / manhã — ⏳ horário a confirmar.",
          "WEB-COPY-05 — Dia do evento / tarde — ⏳ horário a confirmar.",
          "WEB-COPY-06 — Dia do evento / noite — ⏳ horário a confirmar.",
          "WEB-COPY-07 — Pós-evento / manhã — ⏳ horário a confirmar.",
          "WEB-COPY-08 — Pós-evento / tarde — ⏳ horário a confirmar.",
          "WEB-COPY-09 — Pós-evento / noite — ⏳ horário a confirmar.",
          "Definir CTA específico de cada mensagem.",
          "Validar links.",
          "Revisar repetição e coerência da sequência.",
          "⏳ Aprovar as nove copies.",
          "Registrar horários confirmados.",
          "Vincular cada copy ao fluxo correspondente.",
        ],
      },
      {
        code: "07.03",
        title: "TAREFA 07.03 — ⏳ PRODUZIR VÍDEOS WEB-A01, A02 E A03",
        priority: "P1",
        complexity: "high",
        durationMinutes: 180,
        subtasks: [
          "Criar objetivo e ângulo do WEB-A01.",
          "Criar hook, corpo e CTA do WEB-A01.",
          "Criar objetivo e ângulo do WEB-A02.",
          "Criar hook, corpo e CTA do WEB-A02.",
          "Criar objetivo e ângulo do WEB-A03.",
          "Criar hook, corpo e CTA do WEB-A03.",
          "⏳ Aprovar os três roteiros.",
          "⏳ Gravar WEB-A01.",
          "⏳ Gravar WEB-A02.",
          "⏳ Gravar WEB-A03.",
          "⏳ Providenciar edição.",
          "Fazer upload individual.",
          "Testar reprodução.",
          "⏳ Aprovar três arquivos.",
          "Vincular à comunicação do webinário.",
        ],
      },
      {
        code: "07.04",
        title: "TAREFA 07.04 — ⏳ PRODUZIR VÍDEOS WEB-B01, B02 E B03",
        priority: "P1",
        complexity: "high",
        durationMinutes: 180,
        subtasks: [
          "Criar objetivo e ângulo do WEB-B01.",
          "Criar hook, corpo e CTA do WEB-B01.",
          "Criar hook, corpo e CTA do WEB-B02.",
          "Criar hook, corpo e CTA do WEB-B02.",
          "Criar objetivo e ângulo do WEB-B03.",
          "Criar hook, corpo e CTA do WEB-B03.",
          "⏳ Aprovar três roteiros.",
          "⏳ Gravar WEB-B01.",
          "⏳ Gravar WEB-B02.",
          "⏳ Gravar WEB-B03.",
          "⏳ Editar.",
          "Fazer upload individual.",
          "Testar reprodução.",
          "⏳ Aprovar arquivos.",
          "Vincular à distribuição.",
        ],
      },
      {
        code: "07.05",
        title: "TAREFA 07.05 — CONFIGURAR GOOGLE MEET E EVENTO",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "⏳ Confirmar data do evento.",
          "⏳ Confirmar horário de início.",
          "Confirmar responsável pela transmissão.",
          "Criar sala Google Meet.",
          "Gerar link.",
          "Configurar acesso.",
          "Testar entrada com outra conta.",
          "Confirmar funcionamento de áudio.",
          "Confirmar funcionamento de câmera.",
          "Confirmar compartilhamento de tela, se utilizado.",
          "Vincular link às copies aprovadas.",
          "Configurar processo de confirmação de presença.",
          "Confirmar checkout.",
          "Registrar link no Backup Master.",
          "⏳ Aprovar configuração final.",
        ],
      },
      {
        code: "07.06",
        title: 'TAREFA 07.06 — CRIAR COMUNICAÇÃO "ESTAMOS AO VIVO"',
        priority: "P1",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Criar headline de chamada.",
          'Criar copy "Estamos ao Vivo".',
          "Inserir link da sala.",
          "Criar CTA direto de entrada.",
          "Criar mensagem de reforço, se prevista.",
          "Vincular vídeo existente, quando aplicável.",
          "⏳ Aprovar comunicação.",
          "Configurar horário com base no início confirmado.",
          "Testar link.",
          "Validar disparo.",
          "Registrar aprovação.",
        ],
      },
      {
        code: "07.07",
        title: 'TAREFA 07.07 — CRIAR COMUNICAÇÃO "ENCERROU"',
        priority: "P1",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Criar mensagem de encerramento.",
          "Criar orientação para participantes.",
          "Criar orientação para não participantes, se prevista.",
          "Definir CTA pós-evento.",
          "Vincular destino.",
          "Vincular vídeo adicional apenas quando aprovado.",
          "⏳ Aprovar mensagem.",
          "Configurar envio associado ao encerramento.",
          "Testar links.",
          "Registrar validação.",
        ],
      },
      {
        code: "07.08",
        title: "TAREFA 07.08 — AUTOMATIZAR CONVITES E CONFIRMAÇÕES",
        priority: "P1",
        complexity: "high",
        durationMinutes: 120,
        subtasks: [
          "Identificar participantes elegíveis para convite.",
          "Vincular sequência de antecipação.",
          "Vincular vídeos selecionados.",
          "Configurar confirmação de participação.",
          "Registrar confirmação no CRM ou sistema correspondente.",
          "Vincular mensagens do dia do evento.",
          'Configurar "Estamos ao Vivo".',
          "Configurar comunicação pós-evento.",
          "Confirmar horários pendentes.",
          "Evitar envios duplicados.",
          "Testar convites.",
          "Testar confirmação.",
          "Testar links.",
          "Testar mensagens associadas ao evento.",
          "Aprovar fluxo.",
        ],
      },
      {
        code: "07.09",
        title: "TAREFA 07.09 — VALIDAR OPERAÇÃO DO WEBINÁRIO",
        priority: "P1",
        complexity: "high",
        durationMinutes: 120,
        subtasks: [
          "Verificar sala.",
          "Verificar data e horário.",
          "Verificar roteiro do expert.",
          "Verificar seis vídeos de convite.",
          "Verificar nove copies.",
          'Verificar mensagem "Estamos ao Vivo".',
          'Verificar comunicação "Encerrou".',
          "Verificar checkout.",
          "Verificar captura de confirmações.",
          "Verificar capacidade de registrar entradas.",
          "Verificar como será medida a permanência até o final.",
          "Verificar registro de compras.",
          "⏳ Obter aprovação final.",
          "Liberar operação.",
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
        code: "08.01",
        title: "TAREFA 08.01 — CRIAR MATRIZ DAS CAMPANHAS",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "Criar Campanha 01 — Conexão e Solução.",
          "Criar Campanha 02 — Provas e Evidências.",
          "Criar Campanha 03 — Autoridade e Relevância.",
          "Criar Campanha 04 — Boi de Piranha.",
          "Definir hipótese de cada campanha.",
          "Definir ICP.",
          "Definir destino.",
          "Definir CTA.",
          "Definir orçamento a confirmar.",
          "Vincular três registros de criativo a cada campanha.",
          "Verificar consistência com Manual de Marca.",
          "Aprovar matriz.",
        ],
      },
      {
        code: "08.02",
        title: "TAREFA 08.02 — ⏳ CAMPANHA 01 — CONEXÃO E SOLUÇÃO",
        priority: "P1",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 180,
        subtasks: [
          "C01-01 — Criar headline.",
          "C01-01 — Criar hook.",
          "C01-01 — Criar corpo.",
          "C01-01 — Criar CTA.",
          "C01-01 — ⏳ Aprovar roteiro.",
          "C01-01 — ⏳ Gravar/produzir.",
          "C01-01 — ⏳ Editar.",
          "C01-01 — Fazer upload.",
          "C01-01 — Aprovar arquivo.",
          "C01-02 — Criar headline.",
          "C01-02 — Criar hook.",
          "C01-02 — Criar corpo.",
          "C01-02 — Criar CTA.",
          "C01-02 — ⏳ Aprovar roteiro.",
          "C01-02 — ⏳ Gravar/produzir.",
          "C01-02 — ⏳ Editar.",
          "C01-02 — Fazer upload.",
          "C01-02 — Aprovar arquivo.",
          "C01-03 — Criar headline.",
          "C01-03 — Criar hook.",
          "C01-03 — Criar corpo.",
          "C01-03 — Criar CTA.",
          "C01-03 — ⏳ Aprovar roteiro.",
          "C01-03 — ⏳ Gravar/produzir.",
          "C01-03 — ⏳ Editar.",
          "C01-03 — Fazer upload.",
          "C01-03 — Aprovar arquivo.",
          "Configurar campanha.",
          "Vincular os três criativos.",
          "Configurar destino.",
          "Configurar orçamento aprovado.",
          "Conferir anúncios.",
          "Testar links.",
          "Ativar.",
          "Registrar desempenho.",
        ],
      },
      {
        code: "08.03",
        title: "TAREFA 08.03 — ⏳ CAMPANHA 02 — PROVAS E EVIDÊNCIAS",
        priority: "P1",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 180,
        subtasks: [
          "C02-01 — Selecionar prova real.",
          "C02-01 — Confirmar autorização de uso, quando necessária.",
          "C02-01 — Criar headline.",
          "C02-01 — Criar hook, corpo e CTA.",
          "C02-01 — ⏳ Aprovar roteiro.",
          "C02-01 — ⏳ Produzir.",
          "C02-01 — ⏳ Editar.",
          "C02-01 — Fazer upload.",
          "C02-01 — Aprovar.",
          "C02-02 — Definir o que será demonstrado.",
          "C02-02 — Criar headline.",
          "C02-02 — Criar hook, corpo e CTA.",
          "C02-02 — ⏳ Aprovar.",
          "C02-02 — ⏳ Produzir.",
          "C02-02 — ⏳ Editar.",
          "C02-02 — Fazer upload.",
          "C02-02 — Aprovar.",
          "C02-03 — Definir transformação demonstrável.",
          "C02-03 — Verificar evidência disponível.",
          "C02-03 — Criar headline.",
          "C02-03 — Criar hook, corpo e CTA.",
          "C02-03 — ⏳ Aprovar.",
          "C02-03 — ⏳ Produzir.",
          "C02-03 — ⏳ Editar.",
          "C02-03 — Fazer upload.",
          "C02-03 — Aprovar.",
          "Configurar Campanha 02.",
          "Vincular três arquivos.",
          "Configurar destino e orçamento.",
          "Verificar anúncios.",
          "Testar links.",
          "Ativar.",
          "Registrar desempenho.",
        ],
      },
      {
        code: "08.04",
        title: "TAREFA 08.04 — ⏳ CAMPANHA 03 — AUTORIDADE E RELEVÂNCIA",
        priority: "P1",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 180,
        subtasks: [
          "C03-01 — Confirmar evidências de autoridade.",
          "C03-01 — Criar headline.",
          "C03-01 — Criar hook, corpo e CTA.",
          "C03-01 — ⏳ Aprovar.",
          "C03-01 — ⏳ Produzir.",
          "C03-01 — ⏳ Editar.",
          "C03-01 — Fazer upload.",
          "C03-01 — Aprovar.",
          "C03-02 — Selecionar tese validada.",
          "C03-02 — Criar headline.",
          "C03-02 — Criar hook, corpo e CTA.",
          "C03-02 — ⏳ Aprovar.",
          "C03-02 — ⏳ Produzir.",
          "C03-02 — ⏳ Editar.",
          "C03-02 — Fazer upload.",
          "C03-02 — Aprovar.",
          "C03-03 — Selecionar diferencial real.",
          "C03-03 — Criar headline.",
          "C03-03 — Criar hook, corpo e CTA.",
          "C03-03 — ⏳ Aprovar.",
          "C03-03 — ⏳ Produzir.",
          "C03-03 — ⏳ Editar.",
          "C03-03 — Fazer upload.",
          "C03-03 — Aprovar.",
          "Configurar Campanha 03.",
          "Vincular três arquivos.",
          "Configurar destino e orçamento.",
          "Verificar anúncios.",
          "Testar links.",
          "Ativar.",
          "Registrar desempenho.",
        ],
      },
      {
        code: "08.05",
        title: "TAREFA 08.05 — ⏳ CAMPANHA 04 — BOI DE PIRANHA",
        priority: "P1",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 180,
        subtasks: [
          "Confirmar proposta gratuita.",
          "Confirmar o que será entregue.",
          "Confirmar público elegível.",
          "Confirmar mecanismo de captação.",
          "Definir encaminhamento comercial.",
          "⏳ Aprovar proposta.",
          "BP-01 — Criar headline.",
          "BP-01 — Criar hook, corpo e CTA.",
          "BP-01 — ⏳ Aprovar.",
          "BP-01 — ⏳ Gravar/produzir.",
          "BP-01 — ⏳ Editar.",
          "BP-01 — Fazer upload.",
          "BP-01 — Aprovar.",
          "BP-02 — Criar headline.",
          "BP-02 — Criar hook, corpo e CTA.",
          "BP-02 — ⏳ Aprovar.",
          "BP-02 — ⏳ Gravar/produzir.",
          "BP-02 — ⏳ Editar.",
          "BP-02 — Fazer upload.",
          "BP-02 — Aprovar.",
          "BP-03 — Criar headline.",
          "BP-03 — Criar hook, corpo e CTA.",
          "BP-03 — ⏳ Aprovar.",
          "BP-03 — ⏳ Gravar/produzir.",
          "BP-03 — ⏳ Editar.",
          "BP-03 — Fazer upload.",
          "BP-03 — Aprovar.",
          "Configurar Campanha 04.",
          "Vincular três anúncios.",
          "Configurar destino.",
          "Configurar qualificação.",
          "Configurar orçamento.",
          "Testar captação.",
          "Testar encaminhamento.",
          "Ativar.",
          "Registrar leads qualificados.",
          "Registrar conversões.",
        ],
      },
      {
        code: "08.06",
        title: "TAREFA 08.06 — ⏳ CONFIRMAR BUDGET DE VALIDAÇÃO",
        priority: "P1",
        complexity: "low",
        financialImpact: true,
        durationMinutes: 30,
        subtasks: [
          "Definir verba total.",
          "Definir distribuição por campanha.",
          "⏳ Confirmar aprovação financeira.",
          "⏳ Confirmar disponibilidade.",
          "Verificar meio de pagamento.",
          "Registrar autorização.",
        ],
      },
      {
        code: "08.07",
        title: "TAREFA 08.07 — MONITORAR VALIDAÇÃO",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Verificar entrega dos anúncios.",
          "Registrar gasto.",
          "Registrar leads por campanha.",
          "Registrar entradas no grupo.",
          "Registrar interações qualificadas.",
          "Registrar vendas atribuídas.",
          "Comparar criativos.",
          "Identificar ângulos com melhor desempenho.",
          "Registrar hipóteses confirmadas e não confirmadas.",
          "Definir otimizações posteriores.",
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
        code: "09.01",
        title: "TAREFA 09.01 — DEFINIR FORMATO DE VÍDEO",
        priority: "P2",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Consultar linguagem do expert.",
          "Definir formatos possíveis de gravação.",
          "Definir duração por formato.",
          "Criar modelos de hook.",
          "Criar modelos de corpo.",
          "Criar CTA adequado.",
          "Definir orientação de gravação.",
          "⏳ Validar formato com o expert.",
          "Salvar modelos na aba Criativos.",
        ],
      },
      {
        code: "09.02",
        title: "TAREFA 09.02 — PRODUZIR LOTE ORGÂNICO",
        priority: "P2",
        complexity: "high",
        durationMinutes: 180,
        subtasks: [
          "Definir quantidade do lote.",
          "Criar temas.",
          "Criar roteiros.",
          "⏳ Aprovar.",
          "⏳ Atribuir gravações.",
          "⏳ Receber materiais.",
          "⏳ Editar.",
          "Fazer upload.",
          "Revisar arquivos.",
          "Aprovar lote.",
          "Registrar na Biblioteca de Conteúdo.",
        ],
      },
      {
        code: "09.03",
        title: "TAREFA 09.03 — PROGRAMAR DISTRIBUIÇÃO",
        priority: "P2",
        complexity: "medium",
        durationMinutes: 90,
        subtasks: [
          "Definir quantidade de publicações por dia.",
          "Validar capacidade de produção.",
          "Organizar sequência.",
          "Confirmar horários de postagem.",
          "Programar conteúdos disponíveis.",
          "Conferir legendas.",
          "Conferir capas.",
          "Conferir CTA.",
          "Confirmar publicações.",
          "Monitorar visualizações.",
          "Comparar formatos.",
        ],
      },
      {
        code: "09.04",
        title: "TAREFA 09.04 — CRIAR TRÊS STORIES CORINGA",
        priority: "P2",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Criar story coringa 01.",
          "Criar story coringa 02.",
          "Criar story coringa 03.",
          "Criar CTAs correspondentes.",
          "⏳ Solicitar artes ou mídias.",
          "⏳ Aprovar.",
          "Fazer upload.",
          "Disponibilizar na biblioteca.",
        ],
      },
      {
        code: "09.05",
        title: "TAREFA 09.05 — CRIAR NARRATIVA CORINGA",
        priority: "P2",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Definir situação de aplicação.",
          "Criar abertura.",
          "Criar corpo.",
          "Criar CTA.",
          "Revisar linguagem.",
          "⏳ Aprovar.",
          "Registrar preset editável.",
          "Disponibilizar para reutilização.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 10 — REMARKETING E RECUPERAÇÃO
  // =========================================================================
  {
    code: "ETAPA-10",
    title: "ETAPA 10 — REMARKETING E RECUPERAÇÃO",
    position: 9,
    priority: "P1",
    tasks: [
      {
        code: "10.01",
        title: "TAREFA 10.01 — CRIAR SCRIPT DE RECUPERAÇÃO",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Definir público de recuperação.",
          "Criar abordagem pós-evento.",
          "Criar pergunta de percepção.",
          "Criar pergunta de objeção.",
          "Criar resposta para objeções prioritárias.",
          "Criar reabordagem da oferta.",
          "Definir CTA.",
          "⏳ Aprovar script.",
          "Testar mensagens.",
          "Vincular ao CRM.",
        ],
      },
      {
        code: "10.02",
        title: "TAREFA 10.02 — AUTOMATIZAR RECUPERAÇÃO",
        priority: "P1",
        complexity: "high",
        durationMinutes: 120,
        subtasks: [
          "Identificar participantes que não compraram.",
          "Identificar convidados que não compareceram.",
          "Definir segmentos.",
          "Definir sequência por segmento.",
          "Confirmar horários/janelas aplicáveis.",
          "Vincular copies aprovadas.",
          "Configurar gatilhos.",
          "Excluir compradores quando o fluxo não se aplicar a eles.",
          "Testar segmentação.",
          "Testar mensagens.",
          "Corrigir erros.",
          "Aprovar automação.",
          "Registrar recuperações.",
        ],
      },
      {
        code: "10.03",
        title: "TAREFA 10.03 — ⏳ ESTRUTURAR PRODUTO SECUNDÁRIO",
        priority: "P2",
        complexity: "medium",
        financialImpact: true,
        durationMinutes: 90,
        subtasks: [
          "⏳ Definir proposta.",
          "⏳ Confirmar público.",
          "⏳ Confirmar entregáveis.",
          "⏳ Validar preço.",
          "Criar copy de oferta.",
          "Criar CTA.",
          "Configurar checkout.",
          "Testar pagamento.",
          "⏳ Aprovar oferta.",
          "Vincular ao fluxo de recuperação.",
        ],
      },
      {
        code: "10.04",
        title: "TAREFA 10.04 — ⏳ ESTRUTURAR COMUNIDADE RECORRENTE",
        priority: "P2",
        complexity: "high",
        financialImpact: true,
        durationMinutes: 120,
        subtasks: [
          "⏳ Definir proposta.",
          "⏳ Definir conteúdo entregue.",
          "⏳ Definir periodicidade.",
          "⏳ Confirmar modelo de acesso.",
          "Avaliar referência de R$ 37/mês.",
          "Confirmar preço efetivo.",
          "Criar copy.",
          "Criar checkout recorrente.",
          "Testar assinatura.",
          "⏳ Aprovar operação.",
        ],
      },
      {
        code: "10.05",
        title: "TAREFA 10.05 — ORGANIZAR RELACIONAMENTO PASSIVO",
        priority: "P3",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Identificar leads sem compra.",
          "Segmentar contatos.",
          "Selecionar conteúdos aprovados.",
          "Definir cadência após aprovação.",
          "Vincular materiais.",
          "Configurar sequência.",
          "Testar elegibilidade.",
          "Monitorar reativações.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 11 — DASHBOARD, WEBINÁRIO E PERFORMANCE
  // =========================================================================
  {
    code: "ETAPA-11",
    title: "ETAPA 11 — DASHBOARD, WEBINÁRIO E PERFORMANCE",
    position: 10,
    priority: "P1",
    tasks: [
      {
        code: "11.01",
        title: "TAREFA 11.01 — VALIDAR BLOCO INFRA",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Validar progresso de tarefas.",
          "Validar gasto Ads.",
          "Validar entradas no grupo.",
          "Validar saídas do grupo.",
          "Validar testes realizados.",
          "Validar vendas.",
          "Identificar fontes de dados.",
          "Verificar lançamentos manuais.",
          "Verificar integrações.",
          "Testar persistência.",
          "Corrigir inconsistências.",
        ],
      },
      {
        code: "11.02",
        title: "TAREFA 11.02 — CONFIGURAR BLOCO WEBINÁRIO",
        priority: "P1",
        complexity: "high",
        durationMinutes: 90,
        subtasks: [
          "Criar indicador Recebeu convite.",
          "Criar indicador Confirmou participação ao vivo.",
          "Criar indicador Entrou ao vivo.",
          "Criar indicador Ficou até o final.",
          "Criar indicador Comprou.",
          "Definir evento/edição dos dados.",
          "Definir origem dos convites recebidos.",
          "Definir origem das confirmações.",
          "Definir origem dos acessos reais.",
          "Definir como verificar permanência até o final.",
          "Definir origem das compras confirmadas.",
          "Configurar lançamentos manuais quando necessários.",
          "Evitar contagem duplicada.",
          "Calcular taxas de conversão.",
          "Testar atualização.",
          "Verificar persistência.",
          "Aprovar bloco.",
        ],
      },
      {
        code: "11.03",
        title: "TAREFA 11.03 — MONITORAR MÉTRICAS 80/20",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Registrar gasto Ads.",
          "Registrar entradas no grupo.",
          "Registrar testes concluídos.",
          "Registrar checkouts iniciados.",
          "Registrar confirmações de live.",
          "Registrar entradas na live.",
          "Registrar contatos WhatsApp capturados.",
          "Registrar vendas confirmadas.",
          "Verificar consistência das fontes.",
          "Atualizar dashboard.",
        ],
      },
      {
        code: "11.04",
        title: "TAREFA 11.04 — MONITORAR DISTRIBUIÇÃO",
        priority: "P2",
        complexity: "low",
        durationMinutes: 45,
        subtasks: [
          "Registrar visualizações.",
          "Identificar melhores formatos.",
          "Registrar seguidores.",
          "Registrar comentários.",
          "Registrar ligações.",
          "Registrar leads de social selling.",
          "Comparar períodos.",
          "Identificar conteúdos com maior resposta.",
          "Registrar oportunidades de otimização.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 12 — BIBLIOTECA, SCRIPTS, ÁUDIOS E BACKUP
  // =========================================================================
  {
    code: "ETAPA-12",
    title: "ETAPA 12 — BIBLIOTECA, SCRIPTS, ÁUDIOS E BACKUP",
    position: 11,
    priority: "P1",
    tasks: [
      {
        code: "12.01",
        title: "TAREFA 12.01 — CONFIGURAR BIBLIOTECA DE CONTEÚDO",
        priority: "P1",
        complexity: "high",
        durationMinutes: 90,
        subtasks: [
          "Verificar storage persistente.",
          "Configurar acesso por projeto.",
          "Validar permissões.",
          "Habilitar upload de vídeo.",
          "Habilitar upload de áudio.",
          "Habilitar upload de imagem.",
          "Habilitar upload de documentos necessários.",
          "Criar agrupamentos do PVD.",
          "Habilitar pesquisa e filtros.",
          "Testar envio.",
          "Testar reprodução.",
          "Testar acesso após refresh.",
          "Testar reutilização sem duplicar arquivo.",
          "Validar arquivamento e restauração.",
          "Aprovar biblioteca.",
        ],
      },
      {
        code: "12.02",
        title: "TAREFA 12.02 — CONFIGURAR SCRIPTS E ÁUDIOS",
        priority: "P1",
        complexity: "high",
        durationMinutes: 120,
        subtasks: [
          "Validar aba Scripts e Áudios.",
          "Validar criação de solicitação.",
          "Validar campo de título.",
          "Validar contexto da solicitação.",
          "Validar roteiro de apoio.",
          "Validar responsável.",
          "Validar botão Gravar agora.",
          "Testar permissão de microfone.",
          "Testar captura real.",
          "Testar parada da gravação.",
          "Testar escuta antes do envio.",
          "Testar regravação.",
          "Testar upload.",
          "Confirmar armazenamento persistente.",
          "Testar player estilo mensagem de voz.",
          "Testar Play/Pause.",
          "Testar barra de progresso.",
          "Testar velocidade.",
          "Testar múltiplas gravações.",
          "Testar vínculo com tarefas.",
          "Testar vínculo com Manual de Marca.",
          "Testar vínculo com Criativos.",
          "Aprovar módulo.",
        ],
      },
      {
        code: "12.03",
        title: "TAREFA 12.03 — ORGANIZAR BACKUP MASTER",
        priority: "P1",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Criar pasta de Posicionamento.",
          "Criar pasta de Alma da Copy.",
          "Criar pasta de Raio X do ICP.",
          "Criar pasta de Personalidade.",
          "Criar pasta de Copy ADS.",
          "Criar pasta de Grupos.",
          "Criar pasta de Vídeos.",
          "Criar pasta de Áudios.",
          "Criar pasta de Criativos.",
          "Criar pasta de Campanhas.",
          "Criar pasta de Scripts Comerciais.",
          "Criar pasta de Checkout e Links.",
          "Criar pasta de Webinário.",
          "Criar pasta de Automações.",
          "Criar pasta de Relatórios.",
          "Criar pasta de Aprovações.",
          "Conferir permissões.",
          "Testar recuperação de arquivos.",
        ],
      },
      {
        code: "12.04",
        title: "TAREFA 12.04 — VALIDAR ENTREGAS E VERSÕES",
        priority: "P2",
        complexity: "medium",
        durationMinutes: 60,
        subtasks: [
          "Conferir arquivos finais.",
          "Conferir links.",
          "Verificar autor/responsável.",
          "Verificar aprovação.",
          "Registrar versão.",
          "Vincular arquivo à tarefa.",
          "Vincular arquivo ao criativo.",
          "Vincular arquivo à automação, quando aplicável.",
          "Verificar arquivos reutilizados.",
          "Evitar exclusão de arquivos ainda utilizados.",
          "Validar acesso dos usuários autorizados.",
        ],
      },
    ],
  },

  // =========================================================================
  // ETAPA 13 — OTIMIZAÇÕES OPCIONAIS E FUTURAS
  // =========================================================================
  {
    code: "ETAPA-13",
    title: "ETAPA 13 — OTIMIZAÇÕES OPCIONAIS E FUTURAS",
    position: 12,
    priority: "P0",
    tasks: [
      {
        code: "13.01",
        title: "TAREFA 13.01 — REGISTRAR OPORTUNIDADES",
        priority: "P0",
        complexity: "low",
        durationMinutes: 45,
        subtasks: [
          "Descrever oportunidade.",
          "Identificar problema.",
          "Descrever melhoria proposta.",
          "Identificar impacto esperado.",
          "Identificar recursos.",
          "Identificar dependências.",
          "⏳ Solicitar aprovação.",
          "Registrar decisão.",
          "Transformar em execução somente se aprovada.",
        ],
      },
      {
        code: "13.02",
        title: "TAREFA 13.02 — AVALIAR MONETIZAÇÃO ANTECIPADA",
        priority: "P0",
        complexity: "medium",
        financialImpact: true,
        durationMinutes: 60,
        subtasks: [
          "Avaliar utilização do Teste Aliança.",
          "Avaliar oferta após o teste.",
          "Avaliar ingresso pago para workshop.",
          "Avaliar acesso à gravação.",
          "Identificar alterações no checkout.",
          "Identificar necessidade de novas copies.",
          "Identificar novas automações.",
          "⏳ Solicitar aprovação.",
          "Registrar decisão.",
        ],
      },
    ],
  },
];

/**
 * Reconcilia o Workspace com o Checklist Master Completo do PVD (AJ-024).
 * Preserva:
 * - Tarefas concluídas e seus status;
 * - Tempo acumulado e sessões de cronômetro;
 * - Responsáveis e atribuições;
 * - Subtarefas já marcadas como concluídas;
 * Cria:
 * - Etapas ausentes;
 * - Tarefas ausentes;
 * - Subtarefas ausentes para tarefas que não tinham checklist.
 */
export function reconcileWorkspaceWithAJ024(ws: Workspace, ctx: { actorName: string; nowIso: string }): boolean {
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

  // Percorrer cada uma das 13 Etapas do Master Checklist
  for (const stageDef of MASTER_STAGES_PVD) {
    // Tentar localizar estágio existente equivalente
    let matchedStage = existingStages.find((s) => {
      const sTitleUpper = s.title.toUpperCase();
      const defUpper = stageDef.title.toUpperCase();
      // Match por código ("ETAPA 01", "ETAPA 02") ou título exato ou palavras-chave fortes
      if (sTitleUpper.includes(`ETAPA ${stageDef.position + 1 < 10 ? "0" : ""}${stageDef.position + 1}`)) return true;
      if (sTitleUpper.includes(stageDef.code)) return true;
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
      // Atualizar título para a nomenclatura oficial se necessário
      if (matchedStage.title !== stageDef.title) {
        matchedStage.title = stageDef.title;
        changed = true;
      }
      matchedStage.position = stageDef.position;
    }

    const currentStageId = matchedStage.id;

    // 3. Processar Tarefas desta Etapa
    const liveTasksInStage = Object.values(ws.tasks).filter(
      (t) => !t.archivedAt && (t.stageId === currentStageId || t.stageId === matchedStage!.id)
    );

    for (let taskIdx = 0; taskIdx < stageDef.tasks.length; taskIdx++) {
      const taskDef = stageDef.tasks[taskIdx];

      // Localizar tarefa existente correspondente
      let matchedTask = Object.values(ws.tasks).find((t) => {
        if (t.archivedAt) return false;
        const titleUpper = t.title.toUpperCase();
        // Match por código ("01.01", "IM-01", "02.01", "GRP-01", etc.)
        if (titleUpper.includes(taskDef.code)) return true;
        // Match específico por equivalência de código legado
        if (taskDef.code === "01.01" && (titleUpper.includes("IM-01") || titleUpper.includes("POSICIONAMENTO"))) return true;
        if (taskDef.code === "01.02" && (titleUpper.includes("IM-02") || titleUpper.includes("ALMA DA COPY"))) return true;
        if (taskDef.code === "01.03" && (titleUpper.includes("IM-03") || titleUpper.includes("RAIO X"))) return true;
        if (taskDef.code === "01.04" && (titleUpper.includes("IM-04") || titleUpper.includes("PERSONALIDADE"))) return true;
        if (taskDef.code === "01.05" && (titleUpper.includes("IM-05") || titleUpper.includes("COPY ADS"))) return true;
        if (taskDef.code === "01.06" && (titleUpper.includes("IM-06") || titleUpper.includes("MASTER PROMPT"))) return true;
        if (taskDef.code === "01.07" && titleUpper.includes("SCRIPTS E ÁUDIOS")) return true;
        if (taskDef.code === "02.02" && (titleUpper.includes("GRP-01") || titleUpper.includes("CAPA DO GRUPO"))) return true;
        if (taskDef.code === "02.03" && (titleUpper.includes("GRP-02") || titleUpper.includes("DESCRIÇÃO DO GRUPO"))) return true;
        if (taskDef.code === "02.04" && (titleUpper.includes("GRP-03") || titleUpper.includes("SEQUÊNCIA DE COPIES"))) return true;
        if (taskDef.code === "02.05" && (titleUpper.includes("GRP-VID-01") || titleUpper.includes("DESTAQUE DA MANHÃ"))) return true;
        if (taskDef.code === "02.06" && (titleUpper.includes("GRP-VID-02") || titleUpper.includes("MEIO DO DIA"))) return true;
        if (taskDef.code === "02.07" && (titleUpper.includes("GRP-VID-03") || titleUpper.includes("FINAL DO DIA"))) return true;
        if (taskDef.code === "03.01" && titleUpper.includes("AUTO-01")) return true;
        if (taskDef.code === "03.02" && titleUpper.includes("AUTO-02")) return true;
        if (taskDef.code === "03.03" && titleUpper.includes("AUTO-03")) return true;
        if (taskDef.code === "03.04" && titleUpper.includes("AUTO-04")) return true;
        if (taskDef.code === "03.05" && titleUpper.includes("AUTO-05")) return true;
        if (taskDef.code === "03.06" && titleUpper.includes("AUTO-06")) return true;
        if (taskDef.code === "03.07" && (titleUpper.includes("TESTAR OPERAÇÃO") || titleUpper.includes("TEST-01"))) return true;
        return false;
      });

      if (!matchedTask) {
        // Criar tarefa nova
        matchedTask = makeTask(ctx, currentStageId, taskDef.title, taskIdx, {
          priority: taskDef.priority,
          complexity: taskDef.complexity,
          financialImpact: taskDef.financialImpact || false,
          durationMinutes: taskDef.durationMinutes || 60,
          durationSource: "fixed",
          status: "pending",
        });
        ws.tasks[matchedTask.id] = matchedTask;
        changed = true;
      } else {
        // Preserva id, status, assignee, workSessions, mas garante stageId e atualiza título oficial
        if (matchedTask.stageId !== currentStageId) {
          matchedTask.stageId = currentStageId;
          changed = true;
        }
        if (!matchedTask.title.includes(taskDef.code)) {
          matchedTask.title = taskDef.title;
          changed = true;
        }
        if (matchedTask.priority !== taskDef.priority) {
          matchedTask.priority = taskDef.priority;
          changed = true;
        }
      }

      // 4. Subtarefas da Tarefa (Garantia de que nenhuma tarefa fique sem checklist!)
      const existingSubtasks = Object.values(ws.subtasks).filter(
        (st) => !st.archivedAt && st.taskId === matchedTask!.id
      );

      for (let stIdx = 0; stIdx < taskDef.subtasks.length; stIdx++) {
        const subDefTitle = taskDef.subtasks[stIdx];

        // Verificar se já existe subtarefa correspondente
        const matchedSub = existingSubtasks.find((st) => {
          const stTitleTrim = st.title.trim().toLowerCase();
          const defTitleTrim = subDefTitle.trim().toLowerCase();
          if (stTitleTrim === defTitleTrim) return true;
          // Match por código exato (ex: "POS-01", "ALM-01", "ICP-01", "ADS-COPY-01", etc.)
          const codeMatch = subDefTitle.match(/(POS|ALM|ICP|PER|ADS-COPY|GRP-VID|AUTO|AQ|WEB|C01|C02|C03|BP)-(\d+|[A-Z0-9]+)/i);
          if (codeMatch && st.title.toUpperCase().includes(codeMatch[0].toUpperCase())) {
            return true;
          }
          return false;
        });

        if (!matchedSub) {
          // Cria a subtarefa que estava faltando
          const newSub = makeSubtask(ctx, matchedTask.id, subDefTitle, stIdx);
          ws.subtasks[newSub.id] = newSub;
          changed = true;
        } else {
          // Subtarefa já existe: mantém o status 'done' e atualiza o texto para o oficial se mudou levemente
          if (matchedSub.title !== subDefTitle && !matchedSub.title.includes(subDefTitle.slice(0, 15))) {
            matchedSub.title = subDefTitle;
            changed = true;
          }
        }
      }
    }
  }

  if (changed) {
    touch(ws.project, ctx);
    log(ws, ctx, "reconcile", "master_checklist", "pvd", "Checklist Master AJ-024 reconciliado com sucesso");
  }

  return changed;
}
