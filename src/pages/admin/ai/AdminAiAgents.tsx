import { useState } from "react";
import {
  Bot,
  Sparkles,
  Shield,
  Layers,
  Wrench,
  Database,
  CheckCircle2,
  Clock,
  Eye,
  Crown,
  Network,
  FolderTree,
  Grid,
  ArrowDown,
  ChevronRight,
  Info,
  ExternalLink,
  MessageSquare,
  Flame,
  FileText,
  Workflow,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PREPARED_AGENTS, AgentDefinition, getTool, getSkill, ALL_TOOLS, PREPARED_SKILLS } from "@/ai";

// Dicionário explicativo aprofundado sobre o que cada Tool faz no ecossistema
const TOOL_EXPLANATIONS: Record<string, { desc: string; category: string; type: string; permission: string }> = {
  "company.search_brand_manual": {
    desc: "Realiza busca vetorial semântica (RAG) no Manual da Marca da empresa armazenado com pgvector no Supabase. Recupera os trechos mais pertinentes (tese central, posicionamento 7D, mecanismo único, dores de público dos Inconformados/Frustrados/Desenvolvidos) sem precisar carregar todo o manual no prompt.",
    category: "RAG & Inteligência de Negócio",
    type: "read_only",
    permission: "company.read",
  },
  "company.get_brand_manual": {
    desc: "Recupera a ficha estrutural completa do Manual da Marca ativo (tom de voz, promessa, narrativa de autoridade e diretrizes institucionais) para calibrar o vocabulário e a tese dos roteiros.",
    category: "Brand Guidelines",
    type: "read_only",
    permission: "company.read",
  },
  "ai.score_hook": {
    desc: "Avalia um ou mais ganchos de vídeo curto em uma escala de 0 a 100 com base em fórmulas psicológicas validadas no Instagram (Cost Confession, Negative Command, Nobody Tells You, etc.), verificando especificidade, contraste e tempo de retenção nos primeiros 3 segundos.",
    category: "Otimização & Validação de Conteúdo",
    type: "evaluator",
    permission: "ai.use_tools",
  },
  "ai.generate_beat_sheet": {
    desc: "Calcula a folha de tempo da gravação (beat sheet) distribuindo os blocos de fala a uma média de 165 palavras por minuto (ritmo ideal para Reels e TikTok), alertando caso o gancho ultrapasse a barreira crítica de 3.5 segundos.",
    category: "Ritmo & Produção Audiovisual",
    type: "read_only",
    permission: "ai.use_tools",
  },
  "criafy.save_content": {
    desc: "Grava o roteiro aprovado ou conteúdo estruturado diretamente na esteira de publicações e na biblioteca de conteúdo da Criafy vinculada à empresa e conta do cliente.",
    category: "Operação Criafy",
    type: "write_internal",
    permission: "criafy.write",
  },
  "criafy.create_demand": {
    desc: "Abre uma tarefa operacional no Kanban da equipe (ex: 'Gravar Reel: Esteira Lógica', 'Edição de Vídeo', 'Agendamento de Post') com prazo, responsável e briefing anexo.",
    category: "Kanban & Tarefas Criafy",
    type: "write_internal",
    permission: "criafy.write",
  },
  "instagram.get_metrics": {
    desc: "Consulta métricas analíticas da conta de Instagram conectada (alcance médio de Reels, taxa de retenção nos 3s e engajamento) para basear as recomendações em dados reais.",
    category: "Social Media Analytics",
    type: "read_only",
    permission: "instagram.read",
  },
  "crm.get_lead": {
    desc: "Acessa os dados cadastrais, histórico de mensagens, estágio do pipeline e anotações do lead no CRM para permitir um atendimento altamente contextualizado.",
    category: "Dados do Cliente & CRM",
    type: "read_only",
    permission: "crm.read",
  },
  "crm.move_lead": {
    desc: "Move o lead para uma nova etapa do funil de vendas (ex: 'Lead Qualificado', 'Diagnóstico Agendado', 'Contrato Fechado') após a validação lógica na conversa.",
    category: "Esteira de Vendas & CRM",
    type: "write_internal",
    permission: "crm.write",
  },
  "crm.create_note": {
    desc: "Registra uma nota interna na ficha do lead com resumo da interação, pontos de dor declarados e orientações para o vendedor ou estrategista.",
    category: "Notas & Histórico de CRM",
    type: "write_internal",
    permission: "crm.write",
  },
};

// Dicionário explicativo sobre o que cada Skill faz
const SKILL_EXPLANATIONS: Record<string, { desc: string; whenToUse: string; objective: string; category: string }> = {
  "ig-reel": {
    desc: "Roteirização estratégica de Reels com retenção nos primeiros 3 segundos, 3 opções de ganchos pontuados por score_hook, cronometragem por beat sheet a 165 WPM e CTA em loop.",
    whenToUse: "Para produzir vídeos verticais curtos focados em alcance de topo de funil e autoridade.",
    objective: "Garantir retenção em < 3.5s e conduzir para comentário ou direct com palavra-chave.",
    category: "CONTEÚDO",
  },
  "ig-carousel": {
    desc: "Estruturação de carrosséis educativos em 7 slides com gancho de capa irresistível, quebra de objeção no meio e CTA conclusivo no final.",
    whenToUse: "Para temas conceituais, apresentação de metodologia ou quebra de objeções aprofundadas.",
    objective: "Gerar retenção por múltiplos deslizes de tela (swipes), salvamentos e compartilhamentos.",
    category: "CONTEÚDO",
  },
  "ig-caption": {
    desc: "Criação de legendas com gancho forte na janela visível de 125 caracteres antes do '... mais', quebras de linha limpas e direcionamento claro de CTA.",
    whenToUse: "Para acompanhar Reels, carrosséis ou publicações estáticas no feed.",
    objective: "Maximizar cliques em 'mais' e comentários qualificatórios.",
    category: "CONTEÚDO",
  },
  "lead-qualification": {
    desc: "Avaliação de prontidão de compra de leads no atendimento através de perguntas de esteira lógica, separando curiosos de compradores potenciais.",
    whenToUse: "No primeiro contato do lead via WhatsApp ou Chat Express para classificar perfil e maturidade.",
    objective: "Identificar orçamento, momento, autoridade e dores reais antes de direcionar para call de vendas.",
    category: "VENDAS",
  },
  "inbox-triage": {
    desc: "Reconhecimento de intenção de mensagens recebidas (suporte, dúvida de produto, agendamento ou comercial) e roteamento ágil.",
    whenToUse: "Ao receber novas interações de entrada nos canais conectados da empresa.",
    objective: "Garantir tempo de resposta imediato com direcionamento preciso e resolução de dúvidas preliminares.",
    category: "SUPORTE",
  },
};

function getToolMetadata(toolName: string) {
  const t = getTool(toolName);
  const expl = TOOL_EXPLANATIONS[toolName];

  return {
    name: toolName,
    description: expl?.desc || t?.description || "Ferramenta executável com validação de escopo RBAC.",
    category: expl?.category || "Ferramenta Agêntica",
    type: expl?.type || t?.type || "read_only",
    permission: expl?.permission || t?.permission || "ai.use_tools",
    timeout: t?.timeout || 15,
  };
}

function getSkillMetadata(skillSlug: string) {
  const s = getSkill(skillSlug);
  const expl = SKILL_EXPLANATIONS[skillSlug];

  return {
    slug: skillSlug,
    name: s?.name || skillSlug,
    description: expl?.desc || s?.description || "Habilidade especializada associada ao agente.",
    category: expl?.category || s?.category || "GERAL",
    whenToUse: expl?.whenToUse || s?.when_to_use || "Sob demanda da estratégia do agente.",
    objective: expl?.objective || s?.target_objective || "Executar a tarefa dentro das diretrizes operacionais.",
    requiredTools: s?.required_tools || [],
  };
}

export default function AdminAiAgents() {
  const [viewMode, setViewMode] = useState<"organogram" | "grid">("organogram");
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const [selectedToolModal, setSelectedToolModal] = useState<string | null>(null);

  // Separar Agentes por nível hierárquico
  const orchestrator = PREPARED_AGENTS.find(
    (a) => a.hierarchy_level === "orchestrator" || a.slug === "qualify-orchestrator"
  );
  const specialists = PREPARED_AGENTS.filter(
    (a) => a.slug !== orchestrator?.slug
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header com Seletor de Modo de Visualização */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Registro & Framework de Agentes</h1>
            <Badge variant="outline" className="font-mono text-xs bg-primary/5 text-primary border-primary/20">
              {PREPARED_AGENTS.length} Agentes Cadastrados
            </Badge>
            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              LangChain + RAG PgVector
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Cadeia hierárquica e organograma corporativo de agentes: o <strong>Orquestrador Qualify</strong> comanda a estratégia central e delega a execução técnica aos <strong>agentes especialistas departamentais</strong>.
          </p>
        </div>

        {/* Alternador de Visualização: Organograma vs Grade */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 shrink-0 self-start sm:self-auto">
          <Button
            size="sm"
            variant={viewMode === "organogram" ? "default" : "ghost"}
            className="h-8 px-3 text-xs gap-1.5 font-medium rounded-lg"
            onClick={() => setViewMode("organogram")}
          >
            <FolderTree className="h-3.5 w-3.5" />
            <span>Organograma da Cadeia</span>
          </Button>
          <Button
            size="sm"
            variant={viewMode === "grid" ? "default" : "ghost"}
            className="h-8 px-3 text-xs gap-1.5 font-medium rounded-lg"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-3.5 w-3.5" />
            <span>Catálogo em Grade</span>
          </Button>
        </div>
      </div>

      {/* 2. Visualização: ORGANOGRAMA DA CADEIA HIERÁRQUICA */}
      {viewMode === "organogram" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* ============================================================ */}
          {/* NÍVEL 1: O CHEFÃO (ORQUESTRADOR CENTRAL) */}
          {/* ============================================================ */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-3xl relative">
              {/* Badge Flutuante de Nível */}
              <div className="flex justify-center -mb-3 relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md">
                  <Crown className="w-3.5 h-3.5" />
                  Nível 1: O Chefão • Orquestrador Central
                </span>
              </div>

              {orchestrator && (
                <Card className="border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-card to-card shadow-lg hover:shadow-xl transition-all">
                  <CardHeader className="pt-6 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-xs">
                          <Crown className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-xl font-bold">{orchestrator.name}</CardTitle>
                            <Badge className="bg-emerald-600 text-white text-[10px] h-5">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
                            </Badge>
                          </div>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">{orchestrator.slug}</p>
                          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
                            {orchestrator.department || "Direção Geral & Estratégia Qualify"}
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end gap-1 font-mono text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300">
                          {orchestrator.model_profile}
                        </Badge>
                      </div>
                    </div>

                    <CardDescription className="text-xs text-foreground/80 leading-relaxed mt-2.5">
                      {orchestrator.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Tools de RAG e Validação do Chefão */}
                    <div className="p-3 rounded-xl bg-card border border-border/60 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span className="flex items-center gap-1.5 text-foreground">
                          <Wrench className="w-3.5 h-3.5 text-amber-500" />
                          Ferramentas (Tools) sob comando direto do Orquestrador:
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {orchestrator.tools.length} autorizadas
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {orchestrator.tools.map((toolName) => {
                          const meta = getToolMetadata(toolName);
                          return (
                            <button
                              key={toolName}
                              type="button"
                              onClick={() => setSelectedToolModal(toolName)}
                              className="text-left p-2 rounded-lg bg-muted/40 hover:bg-muted/80 border border-border/40 hover:border-primary/40 transition-all group cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">
                                  {toolName}
                                </span>
                                <Info className="w-3 h-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                              </div>
                              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-snug">
                                {meta.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Workflow className="w-3.5 h-3.5 text-primary" />
                        Governa o Copiloto IA e comanda a delegação departamental
                      </span>

                      <Button
                        size="sm"
                        variant="default"
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shadow-xs"
                        onClick={() => setSelectedAgent(orchestrator)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Configuração, Tools & Prompt
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ============================================================ */}
            {/* LINHAS CONECTORAS DO ORGANOGRAMA (TREE CONNECTOR) */}
            {/* ============================================================ */}
            <div className="w-full max-w-4xl flex flex-col items-center my-4 relative">
              {/* Tronco vertical descendo do Orquestrador */}
              <div className="h-8 w-0.5 bg-primary/40" />

              {/* Pílula no centro do tronco */}
              <div className="px-3.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                <Network className="w-3.5 h-3.5" />
                <span>Delegação & Roteamento Especializado LangChain</span>
                <ArrowDown className="w-3 h-3" />
              </div>

              {/* Tronco vertical continuando */}
              <div className="h-6 w-0.5 bg-primary/40" />

              {/* Barra horizontal que distribui para a esquerda e direita */}
              <div className="w-[80%] h-0.5 bg-primary/40 relative">
                {/* Linha vertical descendo para a esquerda (Criafy) */}
                <div className="absolute left-0 top-0 h-6 w-0.5 bg-primary/40" />
                {/* Linha vertical descendo para a direita (CRM) */}
                <div className="absolute right-0 top-0 h-6 w-0.5 bg-primary/40" />
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* NÍVEL 2: AGENTES ESPECIALISTAS DEPARTAMENTAIS (PARES LATERAIS) */}
          {/* ============================================================ */}
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                <Layers className="w-3.5 h-3.5" />
                Nível 2: Especialistas Departamentais (Pares Laterais)
              </span>
              <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
                Estes agentes operam no mesmo nível hierárquico — nenhum é superior ao outro. Cada um domina um domínio específico do negócio e responde diretamente ao Orquestrador.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto pt-2">
              {specialists.map((agent) => {
                const isCriafy = agent.slug.includes("criafy") || agent.slug.includes("instagram");
                const badgeColor = isCriafy
                  ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                  : "bg-blue-500/10 text-blue-600 border-blue-500/20";

                return (
                  <Card
                    key={agent.slug}
                    className={`flex flex-col justify-between border transition-all hover:shadow-md ${
                      isCriafy ? "hover:border-purple-500/50" : "hover:border-blue-500/50"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                              isCriafy
                                ? "bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                                : "bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {isCriafy ? <Sparkles className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg font-bold">{agent.name}</CardTitle>
                              <Badge className="bg-emerald-600 text-white text-[10px] h-4">
                                Ativo
                              </Badge>
                            </div>
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">{agent.slug}</p>
                            <p className="text-xs font-semibold text-foreground/80 mt-1">
                              {agent.department}
                            </p>
                          </div>
                        </div>

                        <Badge variant="outline" className={`font-mono text-[10px] shrink-0 ${badgeColor}`}>
                          {isCriafy ? "🎨 Conteúdo & Redes" : "💬 Atendimento & CRM"}
                        </Badge>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5 pt-2 border-t border-border/40">
                        <span className="font-semibold text-foreground">Reporta ao:</span>
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                          👑 Orquestrador Qualify
                        </Badge>
                      </div>

                      <CardDescription className="text-xs text-foreground/80 leading-relaxed mt-2">
                        {agent.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3.5 pt-0 text-xs">
                      {/* Skills que este agente domina */}
                      {agent.skills.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                            <span className="flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-blue-500" />
                              Skills Especializadas:
                            </span>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              {agent.skills.length} skills
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {agent.skills.map((skillSlug) => {
                              const skillMeta = getSkillMetadata(skillSlug);
                              return (
                                <Badge
                                  key={skillSlug}
                                  variant="secondary"
                                  className="text-[11px] py-0.5 px-2 bg-card border border-border/60 hover:border-primary/40 cursor-pointer font-medium"
                                  title={skillMeta.description}
                                  onClick={() => setSelectedAgent(agent)}
                                >
                                  {skillMeta.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Ferramentas (Tools) que o agente acessa e o que cada uma faz */}
                      <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-amber-500" />
                            Ferramentas (Tools) & O que Cada Uma Faz:
                          </span>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {agent.tools.length} ferramentas
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                          {agent.tools.map((toolName) => {
                            const meta = getToolMetadata(toolName);
                            return (
                              <button
                                key={toolName}
                                type="button"
                                onClick={() => setSelectedToolModal(toolName)}
                                className="w-full text-left p-2 rounded-lg bg-muted/40 hover:bg-muted/80 border border-border/30 hover:border-primary/40 transition-all group cursor-pointer"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">
                                    {toolName}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] py-0 h-4 font-mono">
                                    {meta.type}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                                  {meta.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Botão de Ação */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1.5 hover:bg-muted/80"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspecionar Agente, Tools & Prompt
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Visualização: CATÁLOGO EM GRADE */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {PREPARED_AGENTS.map((agent) => {
            const isOrch = agent.slug === "qualify-orchestrator";
            return (
              <Card key={agent.slug} className="flex flex-col justify-between hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {isOrch ? <Crown className="h-5 w-5 text-amber-500" /> : <Bot className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <p className="text-xs font-mono text-muted-foreground">{agent.slug}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Ativo</Badge>
                  </div>
                  <CardDescription className="text-xs mt-2 line-clamp-2">
                    {agent.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Perfil Modelo
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {agent.model_profile}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-blue-500" /> Skills
                    </span>
                    <span className="font-medium text-foreground">
                      {agent.skills.length > 0 ? `${agent.skills.length} vinculadas` : "Nenhuma"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-amber-500" /> Ferramentas (Tools)
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {agent.tools.length} autorizadas
                    </Badge>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs gap-1.5"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver Configuração & Prompt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MODAL DE INSPEÇÃO DETALHADA DO AGENTE */}
      {/* ============================================================ */}
      <Dialog open={Boolean(selectedAgent)} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          {selectedAgent && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {selectedAgent.slug === "qualify-orchestrator" ? (
                        <Crown className="h-5 w-5 text-amber-500" />
                      ) : (
                        <Bot className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        {selectedAgent.name}
                        <Badge variant="outline" className="font-mono text-xs">
                          v{selectedAgent.version}
                        </Badge>
                      </DialogTitle>
                      <p className="text-xs font-mono text-muted-foreground">{selectedAgent.slug}</p>
                    </div>
                  </div>

                  <Badge className="bg-emerald-600 text-white text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ativo
                  </Badge>
                </div>
                <DialogDescription className="text-xs leading-relaxed mt-2 text-foreground/80">
                  {selectedAgent.description}
                </DialogDescription>
              </DialogHeader>

              {/* Informações de Hierarquia */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Posição no Framework:</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedAgent.slug === "qualify-orchestrator"
                      ? "👑 Chefão / Orquestrador Central (Nível 1)"
                      : "⚡ Agente Especialista Departamental (Nível 2)"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Departamento:</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedAgent.department || "Geral"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Reporta a:</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {selectedAgent.reports_to || "Nenhum (Liderança Master)"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Perfil Modelo:</span>
                  <Badge variant="outline" className="font-mono text-[10px] block mt-0.5">
                    {selectedAgent.model_profile}
                  </Badge>
                </div>
              </div>

              {/* Abas de Detalhamento: Tools, Skills e Prompt */}
              <Tabs defaultValue="tools" className="w-full">
                <TabsList className="grid grid-cols-3 h-9 text-xs">
                  <TabsTrigger value="tools" className="gap-1.5 text-xs">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tools & O Que Fazem ({selectedAgent.tools.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="skills" className="gap-1.5 text-xs">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>Skills ({selectedAgent.skills.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="prompt" className="gap-1.5 text-xs">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Prompt & RBAC</span>
                  </TabsTrigger>
                </TabsList>

                {/* ABA 1: FERRAMENTAS (TOOLS) & EXPLICAÇÃO */}
                <TabsContent value="tools" className="space-y-3 pt-3">
                  <div className="text-xs text-muted-foreground">
                    Estas são as ferramentas que este agente está autorizado a chamar via <strong>Tool Calling (LangChain)</strong> durante a execução:
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {selectedAgent.tools.map((toolName) => {
                      const meta = getToolMetadata(toolName);
                      return (
                        <div
                          key={toolName}
                          className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-all space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-amber-500" />
                              {toolName}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {meta.type}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                <Shield className="w-2.5 h-2.5 mr-1" />
                                {meta.permission}
                              </Badge>
                            </div>
                          </div>

                          <div className="text-xs text-foreground/90 leading-relaxed bg-muted/40 p-2 rounded-lg">
                            <span className="font-bold text-foreground">O que a tool faz: </span>
                            {meta.description}
                          </div>
                        </div>
                      );
                    })}

                    {selectedAgent.tools.length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        Nenhuma ferramenta autorizada para este agente.
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* ABA 2: SKILLS VINCULADAS */}
                <TabsContent value="skills" className="space-y-3 pt-3">
                  <div className="text-xs text-muted-foreground">
                    Habilidades táticas acopladas ao agente para tarefas específicas:
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {selectedAgent.skills.map((skillSlug) => {
                      const meta = getSkillMetadata(skillSlug);
                      return (
                        <div
                          key={skillSlug}
                          className="p-3 rounded-xl border border-border/60 bg-card space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-blue-500" />
                              {meta.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {meta.category}
                            </Badge>
                          </div>

                          <p className="text-xs text-foreground/80 leading-relaxed">
                            {meta.description}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/40">
                            <div>
                              <span className="font-bold text-muted-foreground">Quando ativar: </span>
                              <span className="text-foreground">{meta.whenToUse}</span>
                            </div>
                            <div>
                              <span className="font-bold text-muted-foreground">Objetivo: </span>
                              <span className="text-foreground">{meta.objective}</span>
                            </div>
                          </div>

                          {meta.requiredTools.length > 0 && (
                            <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                              <span className="text-muted-foreground font-semibold">Tools da Skill:</span>
                              {meta.requiredTools.map((t) => (
                                <Badge key={t} variant="secondary" className="font-mono text-[9px] py-0 h-4">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {selectedAgent.skills.length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        Este agente atua como orquestrador direto, roteando e delegando para os agentes que detêm as skills.
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* ABA 3: PROMPT & RBAC */}
                <TabsContent value="prompt" className="space-y-3 pt-3">
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                      Fontes de Contexto Injetadas
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAgent.context_providers.map((cp) => (
                        <Badge key={cp} variant="outline" className="font-mono text-xs">
                          <Database className="w-3 h-3 mr-1 inline text-purple-500" />
                          {cp}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                      Permissões de Sistema (RBAC)
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAgent.permissions.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          <Shield className="h-3 w-3 mr-1 inline" />
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                      System Prompt do Agente
                    </h4>
                    <pre className="p-3 rounded-lg bg-muted font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                      {selectedAgent.system_prompt}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 5. MODAL DE DETALHES DE FERRAMENTA INDIVIDUAL (TOOL) */}
      {/* ============================================================ */}
      <Dialog open={Boolean(selectedToolModal)} onOpenChange={() => setSelectedToolModal(null)}>
        <DialogContent className="max-w-lg">
          {selectedToolModal && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-mono">{selectedToolModal}</DialogTitle>
                    <Badge variant="outline" className="text-[10px] mt-0.5">
                      {getToolMetadata(selectedToolModal).category}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                  <span className="font-bold text-foreground text-xs">O que esta ferramenta faz:</span>
                  <p className="text-muted-foreground leading-relaxed">
                    {getToolMetadata(selectedToolModal).description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase">Tipo de Operação</span>
                    <Badge variant="secondary" className="font-mono text-xs mt-1">
                      {getToolMetadata(selectedToolModal).type}
                    </Badge>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase">Permissão RBAC</span>
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 mt-1">
                      <Shield className="w-3 h-3 mr-1 inline" />
                      {getToolMetadata(selectedToolModal).permission}
                    </Badge>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-border/60 flex items-center justify-between text-muted-foreground">
                  <span>Timeout Seguro de Execução:</span>
                  <span className="font-mono font-bold text-foreground">
                    {getToolMetadata(selectedToolModal).timeout} segundos
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
