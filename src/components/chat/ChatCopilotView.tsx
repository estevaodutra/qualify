import React, { useState, useRef, useEffect } from "react";
import {
  Brain,
  Check,
  CheckCheck,
  ChevronLeft,
  Copy,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { criafyService } from "@/services/criafy/criafyService";
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

  // Match bold (**texto** ou *texto*), italic (_texto_), code (`code`)
  const pattern = /(\*\*([^\*\n]+)\*\*)|(\*([^\*\n]+)\*)|(_([^_\n]+)_)|(`([^`\n]+)`)|(https?:\/\/[^\s]+)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    if (match[2]) {
      // **negrito**
      elements.push(
        <strong key={match.index} className="font-bold text-foreground">
          {match[2]}
        </strong>
      );
    } else if (match[4]) {
      // *negrito* (estilo WhatsApp)
      elements.push(
        <strong key={match.index} className="font-bold text-foreground">
          {match[4]}
        </strong>
      );
    } else if (match[6]) {
      // _itálico_
      elements.push(
        <em key={match.index} className="italic">
          {match[6]}
        </em>
      );
    } else if (match[8]) {
      // `code`
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
  const navigate = useNavigate();

  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "copilot-welcome",
      sender: "ai",
      text: `Olá! Eu sou o **Copiloto & Diretor de Conteúdo IA** da **${activeCompany?.name || "sua empresa"}**.\n\nEstou conectado ao seu **Manual da Marca** e equipado com as **13 Skills do Instagram** (26 fórmulas de ganchos para Reels, roteiros de alta retenção, corte de 125 chars em legendas, auditoria de perfil e filtro humanizador anti-IA).\n\nUse os **comandos rápidos** abaixo ou me diga o que deseja criar:`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      actions: [
        {
          label: "⚡ /reel: Criar Roteiro com Gancho Forte",
          actionType: "add_to_planner",
          payload: {
            theme: "O erro silencioso que custa clientes",
            format: "REEL",
            pillar: "Posicionamento",
            objective: "identificacao",
            angle: "Verdade desconfortável",
            hook: "Ninguém te conta que o seu processo comercial está afastando seus melhores leads.",
            script: "GANCHO (0-3s): Ninguém te conta que o seu processo comercial está afastando seus melhores leads.\n\nPONTE (3-12s): Você atrai pessoas qualificadas, mas demora 2 horas para responder o primeiro contato.\n\nCONTEÚDO (12-30s): Em 2026, quem responde em até 5 minutos fecha 80% das vendas.\n\nCTA: Comente 'PROCESSO' para receber nosso modelo.",
          },
        },
      ],
    },
  ]);

  // Scroll suave para a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Auto-resize do textarea igual ao ChatComposer
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputText]);

  const quickSkills = [
    { cmd: "/reel", label: "⚡ /reel", title: "Roteiro de Reel com 26 Hooks", icon: Film, prompt: "Crie um roteiro de Reel usando uma das fórmulas de gancho mais fortes para o meu nicho." },
    { cmd: "/carrossel", label: "📑 /carrossel", title: "Carrossel Slide a Slide", icon: Layers, prompt: "Monte a estrutura de um carrossel educativo de 7 slides com capa que força o arrasto." },
    { cmd: "/legenda", label: "📝 /legenda", title: "Legenda Otimizada (125 chars)", icon: FileText, prompt: "Escreva uma legenda magnética com chamada para ação e no máximo 5 hashtags focadas." },
    { cmd: "/bio", label: "🔍 /bio", title: "Auditoria de Perfil (0-100)", icon: UserCheck, prompt: "Audite o perfil do Instagram da nossa marca de 0 a 100 com base no método de 12 itens." },
    { cmd: "/viral", label: "🔥 /viral", title: "Modelar Conteúdo Viral", icon: Zap, prompt: "Quais são os ângulos e formatos com maior potencial viral para a minha audiência agora?" },
    { cmd: "/stories", label: "📱 /stories", title: "Sequência de Stories & Funil DM", icon: Flame, prompt: "Planeje uma sequência de 4 stories com enquetes que levem a conversa para a DM." },
    { cmd: "/humanizar", label: "✨ /humanizar", title: "Higienizar Tom de IA", icon: Wand2, prompt: "Humanize o nosso último roteiro removendo clichês e tornando a fala 100% natural." },
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

      let detectedAction = "strategy_plan";
      if (lower.includes("/reel") || lower.includes("reel") || lower.includes("vídeo") || lower.includes("video")) {
        detectedAction = "generate_reel";
      } else if (lower.includes("/carrossel") || lower.includes("carrossel") || lower.includes("carousel") || lower.includes("slide")) {
        detectedAction = "generate_carousel";
      } else if (lower.includes("/legenda") || lower.includes("legenda") || lower.includes("caption")) {
        detectedAction = "generate_caption";
      } else if (lower.includes("/bio") || lower.includes("bio") || lower.includes("perfil") || lower.includes("/auditar")) {
        detectedAction = "audit_profile";
      } else if (lower.includes("/humanizar") || lower.includes("humanizar") || lower.includes("humanize")) {
        detectedAction = "humanize_text";
      } else if (lower.includes("/stories") || lower.includes("stories") || lower.includes("rotina")) {
        detectedAction = "generate_stories";
      }

      let aiResponseText = "";
      let actions: CopilotMessage["actions"] = [];
      let reelMeta: CopilotMessage["reelMeta"] = undefined;
      let captionMeta: CopilotMessage["captionMeta"] = undefined;
      let humanizeMeta: CopilotMessage["humanizeMeta"] = undefined;

      try {
        const aiResult = await AIExecutionService.generate({
          action: detectedAction,
          companyId: activeCompanyId || undefined,
          theme: textToSend,
          customInstruction: `Atue como Copiloto Especialista em Instagram utilizando as heurísticas das 13 Instagram Agent Skills. Seja direto, prático e execute a solicitação sem enrolação.`,
        });

        if (aiResult?.data) {
          const d = aiResult.data;
          if (typeof d === "string") {
            aiResponseText = d;
          } else if (d.script || d.hook) {
            aiResponseText = `### Roteiro de Reel Otimizado\n\n**🎯 Gancho:** ${d.hook || ""}\n\n**🎬 Roteiro:**\n${d.script || ""}\n\n**💬 CTA:** ${d.cta || ""}`;
          } else if (d.strategic_summary) {
            aiResponseText = `### Direção Estratégica\n\n${d.strategic_summary}\n\n**🎯 Objetivo Principal:** ${d.objective || "Engajamento"}`;
          } else {
            aiResponseText = JSON.stringify(d, null, 2);
          }
        }
      } catch (err) {
        if (detectedAction === "generate_reel") {
          const formula = INSTAGRAM_HOOK_FORMULAS[Math.floor(Math.random() * INSTAGRAM_HOOK_FORMULAS.length)];
          const generatedScript = `**GANCHO (0-3s):** ${formula.example}\n\n**TEXTO NA TELA:** [${formula.on_screen}]\n\n**PONTE (3-10s):** A maioria das pessoas comete esse erro e não percebe onde está o gargalo.\n\n**CONTEÚDO (10-25s):** Quando você implementa o método correto, o resultado vem na mesma semana.\n\n**CTA:** Comente 'QUERO' para ver o passo a passo completo.`;

          aiResponseText = `### Roteiro de Reel (Fórmula #${formula.id}: ${formula.name})\n\n` + generatedScript;

          const beats = analyzeReelBeats(generatedScript);
          reelMeta = {
            totalSeconds: beats.totalSeconds,
            formattedDuration: beats.formattedDuration,
            hookValid: beats.hookValid,
            onScreenHook: formula.on_screen,
            beatsCount: beats.beats.length,
          };

          actions = [
            {
              label: "📅 Adicionar ao Planner",
              actionType: "add_to_planner",
              payload: {
                theme: `Reel: ${formula.name}`,
                format: "REEL",
                pillar: "Método",
                hook: formula.example,
                script: generatedScript,
              },
            },
            {
              label: "📋 Criar Demanda",
              actionType: "create_demands",
              payload: {
                title: `Gravar Reel: ${formula.name}`,
                type: "gravar_video",
                description: generatedScript,
              },
            },
          ];
        } else if (detectedAction === "audit_profile") {
          const sampleChecked = ["handle", "photo", "who_for", "value_prop", "proof", "highlights"];
          const audit = calculateProfileScore(sampleChecked);

          aiResponseText = `### Auditoria de Perfil & Bio (Nota: ${audit.score}/100)\n\n` +
            `**Pontos Fortes:**\n` +
            audit.achievedItems.map((item) => `• **${item.name}**: ${item.criteria}`).join("\n") +
            `\n\n**Oportunidades de Correção Prioritária:**\n` +
            audit.missingItems.map((item) => `• **${item.name}**: ${item.fix}`).join("\n");

          actions = [
            {
              label: "📋 Criar Demanda para Ajustar Perfil",
              actionType: "create_demands",
              payload: {
                title: "Otimizar Bio e Perfil do Instagram",
                type: "tarefa_generica",
                description: "Aplicar melhorias detectadas na auditoria de perfil.",
              },
            },
          ];
        } else if (detectedAction === "humanize_text") {
          const sampleText = messages.length > 1 ? messages[messages.length - 1].text : textToSend;
          const hum = humanizeInstagramText(sampleText);
          humanizeMeta = { changesCount: hum.changesMade.length, score: hum.cleanScore };

          aiResponseText = `### Texto Higienizado pelo /ig-human (Nota de Fluidez: ${hum.cleanScore}/100)\n\n` +
            hum.cleanedText +
            `\n\n**Melhorias aplicadas:**\n` +
            (hum.changesMade.length > 0 ? hum.changesMade.map((c) => `• ${c}`).join("\n") : "• O texto já possui excelente fluidez natural.");
        } else if (detectedAction === "generate_caption") {
          const sampleCaption = `Você não precisa de 100k seguidores para vender todo dia. Você só precisa de uma oferta que resolva uma dor real e de um processo comercial que responda o lead em até 5 minutos.\n\nComente 'SISTEMA' que te envio nossa apresentação.\n\n#vendas #b2b #gestao #estrategia #negocios`;
          const lint = lintInstagramCaption(sampleCaption);
          captionMeta = {
            visibleWindow: lint.visibleWindow,
            isTruncated: lint.isTruncated,
            hashtagCount: lint.hashtagCount,
          };

          aiResponseText = `### Legenda Otimizada (Feed Check)\n\n` +
            sampleCaption +
            `\n\n> **Janela Visível no Feed (antes do "... mais"):**\n> "${lint.visibleWindow}..."\n\n` +
            `**Diretrizes Validadas:**\n` +
            lint.passes.map((p) => `• ✅ ${p}`).join("\n") +
            (lint.warnings.length > 0 ? "\n" + lint.warnings.map((w) => `• ⚠️ ${w}`).join("\n") : "");

          actions = [
            {
              label: "📅 Adicionar ao Planner",
              actionType: "add_to_planner",
              payload: {
                theme: "Legenda de Conversão",
                format: "POST",
                script: sampleCaption,
              },
            },
          ];
        } else {
          aiResponseText = `### Diagnóstico & Recomendação\n\nAnalisei a sua solicitação: "${textToSend}". Para acelerar seu engajamento no Instagram mantendo o tom da sua marca, recomendo gerarmos 1 Reel com gancho pontuado ou 1 Carrossel educativo.\n\nEscolha um dos botões ou me dê mais detalhes!`;
          actions = [
            {
              label: "⚡ Gerar Roteiro de Reel",
              actionType: "add_to_planner",
              payload: {
                theme: textToSend,
                format: "REEL",
                script: `Roteiro criado a partir do prompt: ${textToSend}`,
              },
            },
          ];
        }
      }

      const aiMsg: CopilotMessage = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        reelMeta,
        captionMeta,
        humanizeMeta,
        actions,
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
                Copiloto IA
              </h3>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] font-extrabold h-4 px-1.5 shrink-0">
                13 SKILLS INSTAGRAM
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Assistente de Conteúdo & Social Media IA • Manual da Marca Conectado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                  // Usuário (Enviada - estilo chat normal)
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
                      Ações Prontas:
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
            <span>Copiloto digitando e formatando conteúdo...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 3. Rodapé com Comandos Rápidos + Compositor idêntico ao ChatComposer */}
      <div className="p-3 border-t border-border/40 bg-card/10 shrink-0 space-y-2">
        {/* Barra de Comandos Específicos logo acima do Input */}
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

        {/* Textarea Composer idêntico ao ChatComposer */}
        <div className="flex items-end gap-2 bg-background border border-border/60 rounded-2xl p-2 shadow-sm focus-within:border-primary/40 focus-within:shadow-md transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem para o Copiloto ou use /reel, /carrossel, /bio, /legenda..."
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
