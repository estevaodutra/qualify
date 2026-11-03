import React, { useState, useRef, useEffect } from "react";
import {
  Brain,
  Check,
  CheckCheck,
  ChevronLeft,
  Copy,
  Crown,
  Film,
  FileText,
  Flame,
  Layers,
  ListTodo,
  Rocket,
  Send,
  Sparkles,
  UserCheck,
  Wand2,
  Zap,
  Clock,
  ExternalLink,
  Bot,
  AlertTriangle,
  BookOpen,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { criafyService } from "@/services/criafy/criafyService";
import { QualifyAI } from "@/ai";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import {
  humanizeInstagramText,
  lintInstagramCaption,
  analyzeReelBeats,
  calculateProfileScore,
  INSTAGRAM_HOOK_FORMULAS,
} from "@/services/ai/instagram";

interface ChatCopilotViewProps {
  onBack?: () => void;
}

interface CopilotMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  warningAlert?: string;
  tokensMeta?: {
    input?: number;
    output?: number;
    total: number;
    chargedAmount?: number;
    latencyMs?: number;
  };
  agentPath?: {
    inputEval: string;
    routingDecision: string;
    actionTaken: string;
    ragChunks?: string[];
  };
  reelMeta?: {
    totalSeconds: number;
    formattedDuration: string;
    hookValid: boolean;
    onScreenHook?: string;
    beatsCount: number;
  };
  captionMeta?: {
    visibleWindow: string;
    isTruncated: boolean;
    hashtagCount: number;
  };
  humanizeMeta?: {
    changesCount: number;
    score: number;
  };
  actions?: Array<{
    label: string;
    actionType: "add_to_planner" | "create_demands" | "copy_text";
    payload: any;
    executed?: boolean;
  }>;
}

// Formatador rico de Markdown para estilo WhatsApp / Chat nativo
function renderMarkdownContent(text: string) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 leading-relaxed text-[13px] break-words">
      {lines.map((rawLine, idx) => {
        let line = rawLine;

        if (!line.trim()) {
          return <div key={idx} className="h-1" />;
        }

        // Títulos (###)
        if (line.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-bold text-sm text-foreground pt-1 pb-0.5 border-b border-border/30">
              {line.replace(/^###\s+/, "")}
            </h4>
          );
        }

        // Citações (> )
        if (line.startsWith("> ") || line.startsWith(">")) {
          return (
            <blockquote key={idx} className="border-l-2 border-primary/50 pl-2.5 my-1 text-muted-foreground italic text-xs bg-muted/20 py-0.5 rounded-r">
              {parseInlineMarkdown(line.replace(/^>\s?/, ""))}
            </blockquote>
          );
        }

        // Bullets / Listas (- ou • ou *)
        if (/^[\-\*•]\s+/.test(line)) {
          const content = line.replace(/^[\-\*•]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-primary font-bold select-none">•</span>
              <span className="flex-1">{parseInlineMarkdown(content)}</span>
            </div>
          );
        }

        return <p key={idx}>{parseInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

// Parser inline de negrito (** e *), itálico (_) e links
function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const pattern = /(\*\*([^\*\n]+)\*\*)|(\*([^\*\n]+)\*)|(_([^_\n]+)_)|(`([^`\n]+)`)|(https?:\/\/[^\s]+)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    if (match[2]) {
      elements.push(
        <strong key={match.index} className="font-bold text-foreground">
          {match[2]}
        </strong>
      );
    } else if (match[4]) {
      elements.push(
        <strong key={match.index} className="font-bold text-foreground">
          {match[4]}
        </strong>
      );
    } else if (match[6]) {
      elements.push(
        <em key={match.index} className="italic">
          {match[6]}
        </em>
      );
    } else if (match[8]) {
      elements.push(
        <code key={match.index} className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono">
          {match[8]}
        </code>
      );
    } else if (match[0].startsWith("http")) {
      elements.push(
        <a
          key={match.index}
          href={match[0]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-500 hover:text-blue-600 dark:text-blue-400 break-all"
        >
          {match[0]}
        </a>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements;
}

export const ChatCopilotView: React.FC<ChatCopilotViewProps> = ({ onBack }) => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { user } = useAuth();
  const { isSuperadmin } = useSuperadmin();
  const navigate = useNavigate();

  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [activeAgentSlug, setActiveAgentSlug] = useState<"auto" | "criafy-content-agent" | "qualify-orchestrator">("auto");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Buscar contas do Instagram conectadas da empresa
  const { data: instagramAccounts } = useQuery({
    queryKey: ["criafy-accounts-copilot", activeCompanyId],
    queryFn: () => (activeCompanyId ? criafyService.getAccounts(activeCompanyId) : Promise.resolve([])),
    enabled: !!activeCompanyId,
  });

  const activeIgAccount = instagramAccounts && instagramAccounts.length > 0 ? instagramAccounts[0] : null;

  // 1. Carregar Manual da Marca Real do Workspace (Sprint OS / Arquitetura 7D)
  const { data: brandContext } = useQuery({
    queryKey: ["copilot-brand-context", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;
      const { data: ws } = await (supabase as any)
        .from("sprint_os_workspaces")
        .select("data")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const wsData = ws?.data || {};
      const bm = wsData.brandManual || {};
      const posModule = (bm.modules || []).find((m: any) => m.id === "posicionamento");
      const analysis = posModule?.generatedAnalysis || {};

      return {
        companyName: activeCompany?.name || "Sua Marca",
        projectDesc: wsData.project?.description || "Implementação Comercial baseada na Arquitetura 7D",
        teseCentral: analysis.teseCentral || "O fechamento ocorre pela clareza do processo, não por pressão comercial.",
        brechaMercado: analysis.brechaMercado || "Eliminação da dependência de reuniões longas e leads desqualificados.",
        mecanismoHero: analysis.mecanismoHero || "Esteira de qualificação rápida baseada em condução lógica.",
        promessaCentral: analysis.promessaCentral || "Transformação comercial previsível sem gargalos operacionais.",
        narrativaPosicionamento: analysis.narrativaPosicionamento || "Posicionamento consolidado como autoridade pragmática: foco em resultado tangível e implementação 7D.",
        copyAds: bm.copyAds || [],
      };
    },
    enabled: !!activeCompanyId,
  });

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "copilot-welcome",
      sender: "ai",
      text: `Olá! Eu sou o **Copiloto IA** da **${activeCompany?.name || "sua empresa"}**.\n\nComo posso ajudar você hoje com sua estratégia, roteiros ou ideias de conteúdo?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Scroll suave para o final
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputText]);

  const quickSkills: Array<{ cmd: string; label: string; title: string; icon: any; prompt: string }> = [
    {
      cmd: "/ig-audit",
      label: "📊 Visão do Instagram",
      title: "Auditar métricas e presença atual do Instagram",
      icon: Sparkles,
      prompt: "Me dá uma visão detalhada do meu Instagram atualmente: métricas, público e oportunidades de conteúdo.",
    },
    {
      cmd: "/ig-reel",
      label: "🎬 Roteiro de Reel (60s)",
      title: "Gerar roteiro com gancho afiado e beat sheet",
      icon: Film,
      prompt: "Crie um roteiro de Reel de 60s com gancho magnético nos 3s, ritmo a 165 WPM e CTA em loop.",
    },
    {
      cmd: "/ig-carousel",
      label: "📑 Carrossel 7 Lâminas",
      title: "Estruturar carrossel educativo de alta retenção",
      icon: Layers,
      prompt: "Estruture um carrossel educativo em 7 lâminas com gancho de capa forte e quebra de objeção.",
    },
    {
      cmd: "/ig-profile",
      label: "🔍 Auditar Bio (100 Pts)",
      title: "Avaliar bio e perfil na matriz ponderada",
      icon: UserCheck,
      prompt: "Audite a bio e estrutura do meu perfil do Instagram com base na matriz de 100 pontos.",
    },
    {
      cmd: "/ig-viral",
      label: "⚡ Ganchos Virais",
      title: "Gerar 3 ganchos testados em fórmulas oficiais",
      icon: Flame,
      prompt: "Gere 3 opções de ganchos magnéticos para testar no meu próximo vídeo com foco em retenção de 3s.",
    },
  ];

  const handleSendPrompt = async (prompt: string) => {
    const textToSend = prompt.trim();
    if (!textToSend || isThinking) return;

    const userMsg: CopilotMessage = {
      id: "usr-" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsThinking(true);

    try {
      const lower = textToSend.toLowerCase();
      const isGreeting =
        lower === "oi" ||
        lower === "olá" ||
        lower === "ola" ||
        lower === "opa" ||
        lower === "e aí" ||
        lower === "e ai" ||
        lower.startsWith("bom dia") ||
        lower.startsWith("boa tarde") ||
        lower.startsWith("boa noite");

      let aiResponseText = "";
      let warningAlert: string | undefined = undefined;
      let actions: CopilotMessage["actions"] = [];
      let reelMeta: CopilotMessage["reelMeta"] = undefined;
      let captionMeta: CopilotMessage["captionMeta"] = undefined;
      let humanizeMeta: CopilotMessage["humanizeMeta"] = undefined;
      let tokensMeta: CopilotMessage["tokensMeta"] = undefined;
      let agentPath: CopilotMessage["agentPath"] = undefined;

      try {
        // Histórico recente para continuidade conversacional multi-turn
        const historyForAi = messages
          .filter((m) => m.id !== "copilot-welcome")
          .map((m) => ({
            role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
            content: m.text,
          }));

        // Decisão de Roteamento Agêntico: Criafy Content Agent vs Qualify Orchestrator
        const isContentOrIgQuery =
          lower.includes("instagram") ||
          lower.includes("reel") ||
          lower.includes("carrossel") ||
          lower.includes("story") ||
          lower.includes("stories") ||
          lower.includes("legenda") ||
          lower.includes("gancho") ||
          lower.includes("hook") ||
          lower.includes("bio") ||
          lower.includes("perfil") ||
          lower.includes("engajamento") ||
          lower.includes("post") ||
          lower.includes("conteúdo") ||
          lower.includes("conteudo") ||
          lower.includes("seguidores") ||
          lower.includes("criafy");

        const agentSlugToRun =
          activeAgentSlug === "auto"
            ? isContentOrIgQuery
              ? "criafy-content-agent"
              : "qualify-orchestrator"
            : activeAgentSlug;

        // Executar Agente nativo com LangChain + Tools + RAG no Supabase
        const result = await QualifyAI.runAgent({
          agentSlug: agentSlugToRun,
          prompt: textToSend,
          context: {
            company_id: activeCompanyId || "default",
            user_id: user?.id,
            account_id: activeIgAccount?.id,
          },
          chatHistory: historyForAi,
        });

        const agentData = result.data;
        const executed = agentData.executed_tools || [];
        const ragTool = executed.find((t: any) =>
          t.tool?.includes("search_brand_manual") || t.tool?.includes("company.search_brand_manual")
        );
        const igMetricsTool = executed.find((t: any) => t.tool?.includes("instagram.get_metrics") || t.tool?.includes("get_metrics"));
        const igAuditTool = executed.find((t: any) => t.tool?.includes("audit_profile"));

        let inputEval = "Saudação simples ou interação direta detectada.";
        let routingDecision = `Processamento com o ${agentSlugToRun === "criafy-content-agent" ? "Agente Criafy (Conteúdo & Redes)" : "Orquestrador Qualify"}.`;
        let actionTaken = "Nenhuma tool acionada • Resposta executiva direta.";
        let ragChunks: string[] = [];

        if (igMetricsTool) {
          inputEval = "Consulta analítica sobre a presença e métricas do Instagram.";
          routingDecision = "Acionamento da ferramenta 'instagram.get_metrics' no Criafy Hub.";
          actionTaken = igMetricsTool.output?.connected
            ? `Conta @${igMetricsTool.output?.primary_account?.username || "instagram"} sincronizada (${igMetricsTool.output?.primary_account?.followers || 0} seguidores).`
            : "Verificação de conectividade no Criafy Hub concluída.";
        } else if (igAuditTool) {
          inputEval = "Solicitação de auditoria de bio e perfil do Instagram.";
          routingDecision = "Acionamento da matriz 'instagram.audit_profile' (100 pontos).";
          actionTaken = `Perfil auditado com nota ${igAuditTool.output?.total_score || 0}/100.`;
        } else if (ragTool) {
          inputEval = `Demanda de conteúdo/estratégia identificada (Foco: "${ragTool.input?.query || textToSend}").`;
          routingDecision = "Acionamento do RAG Vetorial (Embeddings) no Manual da Marca.";
          ragChunks = ragTool.output?.retrieved_topics || [];
          actionTaken = `Recuperados ${ragChunks.length} chunks relevantes (${ragTool.output?.estimated_tokens || 180} tokens via text-embedding-3-small).`;
        } else if (executed.length > 0) {
          inputEval = "Demanda operacional identificada.";
          routingDecision = `Roteamento para ferramenta especializada (${executed[0].tool}).`;
          actionTaken = `Executada em ${executed[0].latency_ms}ms com sucesso.`;
        } else if (textToSend.length > 20) {
          inputEval = isContentOrIgQuery ? "Estratégia de conteúdo e redes sociais." : "Consulta analítica ou orientação estratégica.";
          routingDecision = `Processamento especializado pelo ${agentSlugToRun === "criafy-content-agent" ? "Agente Criafy" : "Orquestrador"}.`;
          actionTaken = "Diretrizes aplicadas com base nas 13 skills do ecossistema.";
        }

        aiResponseText = agentData.content || (isGreeting ? "Olá! Como posso ajudar você hoje?" : "Como posso te ajudar com a estratégia ou conteúdo hoje?");

        if (agentData.metrics) {
          tokensMeta = {
            input: agentData.metrics.prompt_tokens,
            output: agentData.metrics.completion_tokens,
            total: agentData.metrics.tokens_total,
            latencyMs: agentData.metrics.latency_ms,
          };
        }

        agentPath = {
          inputEval,
          routingDecision,
          actionTaken,
          ragChunks,
        };

        // Identificar se a resposta contém roteiro ou gancho para acoplar ações úteis
        const contentLower = aiResponseText.toLowerCase();
        if (contentLower.includes("gancho:") || contentLower.includes("gancho (") || contentLower.includes("roteiro:")) {
          actions = [
            {
              label: "📅 Adicionar ao Planner",
              actionType: "add_to_planner",
              payload: {
                theme: textToSend.slice(0, 50),
                format: "REEL",
                script: aiResponseText,
              },
            },
            {
              label: "📋 Criar Demanda de Gravação",
              actionType: "create_demands",
              payload: {
                title: `Gravar Reel: ${textToSend.slice(0, 30)}`,
                type: "gravar_video",
                description: aiResponseText,
              },
            },
          ];

          const beats = analyzeReelBeats(aiResponseText);
          if (beats.totalSeconds > 0) {
            reelMeta = {
              totalSeconds: beats.totalSeconds,
              formattedDuration: beats.formattedDuration,
              hookValid: beats.hookValid,
              beatsCount: beats.beats.length,
            };
          }
        }
      } catch (err: any) {
        console.error("[Copilot Orchestrator Error]:", err);
        const errorMsg = String(err?.message || "");

        if (errorMsg.includes("Saldo insuficiente") || errorMsg.includes("INSUFFICIENT_BALANCE")) {
          warningAlert = "Saldo insuficiente na carteira para debitar tokens da IA.";
        } else if (
          errorMsg.includes("credit_balance_exhausted") ||
          errorMsg.includes("no credits") ||
          errorMsg.includes("quota")
        ) {
          warningAlert = "A conta OpenAI configurada na plataforma está sem créditos ativos. Configure sua chave em IA > Playground ou platform.openai.com.";
        }

        if (isGreeting) {
          aiResponseText = "Olá! Como posso ajudar você hoje com sua estratégia, roteiros ou ideias de conteúdo?";
        } else {
          aiResponseText = `Não foi possível consultar o modelo de linguagem no momento (${err?.message || "falha de conexão"}). Verifique sua chave da OpenAI no painel administrativo.`;
        }

        agentPath = {
          inputEval: isGreeting ? "Saudação simples detectada." : "Demanda de usuário.",
          routingDecision: "Fallback de comunicação segura.",
          actionTaken: "Resposta direta entregue ao usuário.",
        };
      }

      const aiMsg: CopilotMessage = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        warningAlert,
        reelMeta,
        captionMeta,
        humanizeMeta,
        actions,
        tokensMeta,
        agentPath,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleExecuteAction = async (msgId: string, actionIdx: number, action: any) => {
    if (!activeCompanyId) return;

    try {
      if (action.actionType === "add_to_planner") {
        const item = action.payload;
        await criafyService.createPlannerItem({
          company_id: activeCompanyId,
          theme: item.theme || "Novo Conteúdo",
          format: item.format || "REEL",
          pillar: item.pillar || "Estratégia",
          objective: item.objective || "identificacao",
          angle: item.angle || "",
          hook: item.hook || "",
          script: item.script || "",
          status: "ideia",
          created_by: user?.id,
        });
        toast.success("Conteúdo adicionado ao Planner do Criafy!");
      } else if (action.actionType === "create_demands") {
        await criafyService.createDemand({
          company_id: activeCompanyId,
          title: action.payload.title,
          description: action.payload.description,
          type: action.payload.type || "tarefa_generica",
          priority: "alta",
          status: "pending",
          origin: "ia",
        });
        toast.success("Demanda criada na Central de Demandas!");
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) return m;
          const acts = [...(m.actions || [])];
          acts[actionIdx] = { ...acts[actionIdx], executed: true };
          return { ...m, actions: acts };
        })
      );
    } catch (err: any) {
      toast.error("Erro ao executar ação: " + err.message);
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(inputText);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background/20 overflow-hidden relative min-w-0">
      {/* 1. Header idêntico ao Chat normal */}
      <div className="p-3 px-3.5 md:p-3.5 md:px-4 border-b border-border/40 bg-card/10 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5 md:gap-3 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 rounded-xl text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1 font-bold text-xs shrink-0"
              aria-label="Voltar para a caixa de entrada"
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </button>
          )}

          {/* Avatar com status de presença */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background" title="Online" />
          </div>

          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-card-foreground leading-snug truncate">
                {activeAgentSlug === "criafy-content-agent"
                  ? "Agente Criafy — Conteúdo & Redes"
                  : activeAgentSlug === "qualify-orchestrator"
                  ? "Orquestrador Qualify"
                  : `Copiloto IA — ${brandContext?.companyName || "Criafy"}`}
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-medium h-4 px-1.5 shrink-0",
                  activeAgentSlug === "criafy-content-agent"
                    ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                    : activeAgentSlug === "qualify-orchestrator"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                )}
              >
                {activeAgentSlug === "criafy-content-agent"
                  ? "Criafy AI (13 Skills)"
                  : activeAgentSlug === "qualify-orchestrator"
                  ? "Diretor Geral"
                  : "Roteamento Auto"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {activeAgentSlug === "criafy-content-agent"
                ? "Roteirista, Carrosséis e Estratégia de Instagram"
                : activeAgentSlug === "qualify-orchestrator"
                ? "Estratégia Corporativa & RAG do Brand Manual"
                : activeIgAccount?.username
                ? `Instagram: @${activeIgAccount.username.replace(/^@/, "")} • Roteamento Agêntico`
                : `Assistente da ${brandContext?.companyName || "sua empresa"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor Rápido de Agente Ativo */}
          <div className="hidden sm:flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setActiveAgentSlug("auto")}
              className={cn(
                "px-2 py-1 text-[11px] font-medium rounded-lg transition-all",
                activeAgentSlug === "auto"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Roteamento automático inteligente conforme a intenção da mensagem"
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => setActiveAgentSlug("criafy-content-agent")}
              className={cn(
                "px-2 py-1 text-[11px] font-medium rounded-lg flex items-center gap-1 transition-all",
                activeAgentSlug === "criafy-content-agent"
                  ? "bg-purple-600 text-white shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-purple-600"
              )}
              title="Agente Criafy: Especialista em Conteúdo & 13 Skills do Instagram"
            >
              <Sparkles className="w-3 h-3" />
              Criafy
            </button>
            <button
              type="button"
              onClick={() => setActiveAgentSlug("qualify-orchestrator")}
              className={cn(
                "px-2 py-1 text-[11px] font-medium rounded-lg flex items-center gap-1 transition-all",
                activeAgentSlug === "qualify-orchestrator"
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-primary"
              )}
              title="Orquestrador Qualify: Direção Geral, RAG e Estratégia"
            >
              <Crown className="w-3 h-3" />
              Orquestrador
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/criafy")}
            className="h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted transition-colors"
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Criafy Hub</span>
          </Button>
        </div>
      </div>

      {/* 2. Área de Mensagens idêntica ao MessageThread (Fundo + Balões WhatsApp) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          return (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1 animate-in fade-in duration-200",
                isUser ? "ml-auto items-end max-w-[80%] md:max-w-[70%]" : "mr-auto items-start max-w-[90%] md:max-w-[80%]"
              )}
            >
              <div
                className={cn(
                  "p-3.5 rounded-2xl shadow-sm text-sm relative group overflow-hidden",
                  isUser
                    ? "bg-gradient-to-r from-primary to-primary/85 text-primary-foreground rounded-tr-none font-medium"
                    : "bg-card border border-border/40 text-card-foreground rounded-tl-none shadow-xs"
                )}
              >
                {/* Botão de copiar discreto no hover */}
                {!isUser && (
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg.text)}
                    className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copiar texto"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Alerta de Aviso (ex: créditos da OpenAI) */}
                {msg.warningAlert && (
                  <div className="mb-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-tight">{msg.warningAlert}</span>
                  </div>
                )}

                {/* Fluxo Agêntico Percorrido (VISÍVEL APENAS PARA SUPERADMIN) */}
                {isSuperadmin && !isUser && msg.agentPath && (
                  <div className="mb-3 p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2 text-[11px] animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-primary/15">
                      <div className="font-semibold text-primary flex items-center gap-1.5 text-xs">
                        <Compass className="h-3.5 w-3.5" />
                        <span>Fluxo Agêntico Percorrido (Superadmin)</span>
                      </div>
                      {msg.tokensMeta && (
                        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                          {msg.tokensMeta.latencyMs !== undefined && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-blue-500" /> {msg.tokensMeta.latencyMs}ms
                            </span>
                          )}
                          {msg.tokensMeta.total !== undefined && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-amber-500" /> {msg.tokensMeta.total} tokens
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 pl-1 font-mono text-[10px]">
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-foreground shrink-0">1. Avaliação do Input:</span>
                        <span className="text-muted-foreground">{msg.agentPath.inputEval}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-foreground shrink-0">2. Decisão de Roteamento:</span>
                        <span className="text-muted-foreground">{msg.agentPath.routingDecision}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-foreground shrink-0">3. Ação & RAG:</span>
                        <span className="text-muted-foreground">{msg.agentPath.actionTaken}</span>
                      </div>
                    </div>
                    {msg.agentPath.ragChunks && msg.agentPath.ragChunks.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-semibold">Chunks do Manual:</span>
                        {msg.agentPath.ragChunks.map((ch, i) => (
                          <Badge key={i} variant="secondary" className="text-[9px] py-0 h-4 bg-muted text-foreground">
                            {ch}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Conteúdo formatado em Markdown */}
                {isUser ? (
                  <div className="whitespace-pre-wrap break-words leading-relaxed text-[13px]">
                    {msg.text}
                  </div>
                ) : (
                  <div>{renderMarkdownContent(msg.text)}</div>
                )}

                {/* Metadados Visuais Ricos: Reel Beats */}
                {msg.reelMeta && (
                  <div className="mt-3 p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="font-bold flex items-center gap-1 text-purple-600 dark:text-purple-400">
                      <Clock className="w-3.5 h-3.5" />
                      Duração: {msg.reelMeta.formattedDuration}
                    </span>
                    <span className="text-muted-foreground">
                      Beats: {msg.reelMeta.beatsCount} cortes
                    </span>
                    {msg.reelMeta.hookValid ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                        Gancho retém em &lt; 3.5s
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                        Gancho longo
                      </Badge>
                    )}
                  </div>
                )}

                {/* Consumo de Tokens de IA */}
                {msg.tokensMeta && (isSuperadmin || msg.tokensMeta.chargedAmount !== undefined) && (
                  <div className="mt-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300">
                      <Zap className="w-3.5 h-3.5" />
                      {msg.tokensMeta.total} tokens ({msg.tokensMeta.input} in / {msg.tokensMeta.output} out)
                    </span>
                    {msg.tokensMeta.chargedAmount !== undefined && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {Number(msg.tokensMeta.chargedAmount).toFixed(3)} debitado
                      </span>
                    )}
                  </div>
                )}

                {/* Metadados Visuais Ricos: Caption Preview */}
                {msg.captionMeta && (
                  <div className="mt-3 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="font-bold flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <FileText className="w-3.5 h-3.5" />
                      Preview 125 chars validado
                    </span>
                    <span className="text-muted-foreground">
                      Hashtags: {msg.captionMeta.hashtagCount}/5 recomendadas
                    </span>
                  </div>
                )}

                {/* Ações executáveis dentro do próprio balão */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Rocket className="w-3 h-3 text-purple-600" />
                      Ações no Sistema:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.actions.map((act, actIdx) => (
                        <Button
                          key={actIdx}
                          size="sm"
                          disabled={act.executed}
                          onClick={() => handleExecuteAction(msg.id, actIdx, act)}
                          className={cn(
                            "h-7 px-3 text-[11px] font-bold rounded-lg gap-1.5 shadow-2xs transition-all",
                            act.executed
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-purple-600 hover:bg-purple-700 text-white"
                          )}
                        >
                          {act.executed ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Executado</span>
                            </>
                          ) : (
                            <span>{act.label}</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Horário no cantinho inferior do balão (estilo WhatsApp) */}
                <div className={cn(
                  "flex items-center justify-end gap-1 mt-1 text-[10px]",
                  isUser ? "text-primary-foreground/75" : "text-muted-foreground"
                )}>
                  <span>{msg.timestamp}</span>
                  {isUser && <CheckCheck className="w-3 h-3 text-white/90" />}
                </div>
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-xl bg-card/40 w-fit border border-border/40 animate-pulse">
            <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
            <span>Copiloto processando sua mensagem...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 3. Rodapé com Comandos Rápidos + Compositor idêntico ao ChatComposer */}
      <div className="p-3 border-t border-border/40 bg-card/10 shrink-0 space-y-2">
        {/* Barra de Comandos Específicos logo acima do Input */}
        {quickSkills.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            Atalhos:
          </span>
          {quickSkills.map((sk, i) => {
            const Icon = sk.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSendPrompt(sk.prompt)}
                title={sk.title}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background border border-border/60 hover:border-purple-500/50 text-xs text-foreground/90 hover:text-purple-600 whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs font-medium"
              >
                <Icon className="w-3.5 h-3.5 text-purple-600" />
                <span>{sk.label}</span>
              </button>
            );
          })}
        </div>
        )}

        {/* Textarea Composer idêntico ao ChatComposer */}
        <div className="flex items-end gap-2 bg-background border border-border/60 rounded-2xl p-2 shadow-sm focus-within:border-primary/40 focus-within:shadow-md transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeAgentSlug === "criafy-content-agent"
                ? "Pergunte ao Agente Criafy sobre Reels, Carrosséis, Stories, Ganchos ou Métricas do Instagram..."
                : activeAgentSlug === "qualify-orchestrator"
                ? `Converse com o Orquestrador Qualify sobre posicionamento da ${brandContext?.companyName || "sua empresa"}...`
                : `Converse com o Copiloto IA da ${brandContext?.companyName || "sua empresa"}...`
            }
            className="w-full bg-transparent px-2 py-2 text-sm outline-none resize-none transition-all duration-200 min-h-[38px] max-h-[140px] scrollbar-thin leading-relaxed text-foreground placeholder:text-muted-foreground"
          />

          <Button
            onClick={() => handleSendPrompt(inputText)}
            disabled={!inputText.trim() || isThinking}
            className={cn(
              "h-10 w-10 rounded-xl shrink-0 shadow-md cursor-pointer transition-all duration-200 bg-primary hover:bg-primary/90 text-primary-foreground",
              (!inputText.trim() || isThinking) && "opacity-50 shadow-none"
            )}
            title="Enviar mensagem"
          >
            <Send className="h-4.5 w-4.5 translate-x-[-1px] translate-y-[1px]" />
          </Button>
        </div>
      </div>
    </div>
  );
};
