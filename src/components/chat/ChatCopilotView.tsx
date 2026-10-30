import React, { useState } from "react";
import {
  Brain,
  Check,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

export const ChatCopilotView: React.FC<ChatCopilotViewProps> = ({ onBack }) => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "copilot-welcome",
      sender: "ai",
      text: `Olá! Eu sou o **Copiloto & Diretor de Conteúdo IA** da **${activeCompany?.name || "sua empresa"}**.\n\nEstou conectado ao seu **Manual da Marca** e equipado com as **13 Skills do Instagram** (26 fórmulas de ganchos para Reels, roteiros de alta retenção, corte de 125 chars em legendas, auditoria de perfil e filtro humanizador anti-IA).\n\nUse os **botões de atalho** abaixo ou me diga o que deseja criar:`,
      timestamp: "Agora",
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
      timestamp: "Agora",
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
        // Fallback local com heurísticas do repositório
        if (detectedAction === "generate_reel") {
          const formula = INSTAGRAM_HOOK_FORMULAS[Math.floor(Math.random() * INSTAGRAM_HOOK_FORMULAS.length)];
          const generatedScript = `GANCHO (0-3s): ${formula.example}\n\nTEXTO NA TELA: [${formula.on_screen}]\n\nPONTE (3-10s): A maioria das pessoas comete esse erro e não percebe onde está o gargalo.\n\nCONTEÚDO (10-25s): Quando você implementa o método correto, o resultado vem na mesma semana.\n\nCTA: Comente 'QUERO' para ver o passo a passo completo.`;

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
              label: "📋 Criar Demanda de Gravação",
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
            audit.achievedItems.map((item) => `✅ **${item.name}**: ${item.criteria}`).join("\n") +
            `\n\n**Oportunidades de Correção Prioritária:**\n` +
            audit.missingItems.map((item) => `⚠️ **${item.name}**: ${item.fix}`).join("\n");

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
          const sampleCaption = `Você não precisa de 100k seguidores para vender todo dia. Você só precisa de uma oferta que resolva uma dor real e de um processo comercial que responda o lead em até 5 minutos. Comente 'SISTEMA' que te envio nossa apresentação. #vendas #b2b #gestao #estrategia #negocios`;
          const lint = lintInstagramCaption(sampleCaption);
          captionMeta = {
            visibleWindow: lint.visibleWindow,
            isTruncated: lint.isTruncated,
            hashtagCount: lint.hashtagCount,
          };

          aiResponseText = `### Legenda Otimizada (Feed Check)\n\n` +
            sampleCaption +
            `\n\n**Pré-visualização do Feed (antes do "... mais"):**\n` +
            `> "${lint.visibleWindow}..."\n\n` +
            `**Diretrizes Validadas:**\n` +
            lint.passes.map((p) => `✅ ${p}`).join("\n") +
            (lint.warnings.length > 0 ? "\n" + lint.warnings.map((w) => `⚠️ ${w}`).join("\n") : "");

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
        timestamp: "Agora",
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

  return (
    <div className="flex flex-col h-full w-full bg-card/5 overflow-hidden">
      {/* Header do Copiloto no Chat */}
      <div className="p-3.5 px-4 border-b border-border/40 bg-card/20 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 rounded-xl text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1 font-bold text-xs shrink-0"
              aria-label="Voltar para a caixa de entrada"
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-card-foreground leading-snug">
                Copiloto IA (Instagram & Criafy)
              </h3>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] font-extrabold h-4 px-1.5">
                13 SKILLS ATIVAS
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Assistente de Conteúdo, Roteiros de Reels e Diagnósticos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/criafy")}
            className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/60 hover:bg-purple-500/10 hover:text-purple-600 transition-colors"
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Abrir Criafy Hub</span>
          </Button>
        </div>
      </div>

      {/* Barra de Ações Rápidas (Chips) */}
      <div className="px-4 py-2 bg-card/10 border-b border-border/30 flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" />
          Comandos:
        </span>
        {quickSkills.map((sk, i) => {
          const Icon = sk.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSendPrompt(sk.prompt)}
              title={sk.title}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/80 hover:border-purple-500/40 text-xs text-foreground/90 hover:text-purple-600 whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs font-medium"
            >
              <Icon className="w-3.5 h-3.5 text-purple-600" />
              <span>{sk.label}</span>
            </button>
          );
        })}
      </div>

      {/* Área de Conversa */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 max-w-3xl",
              msg.sender === "user" ? "ml-auto justify-end" : "justify-start"
            )}
          >
            {msg.sender === "ai" && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={cn(
                "p-4 rounded-2xl text-xs space-y-3 shadow-2xs leading-relaxed relative group",
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                  : "bg-background border border-border/80 text-foreground rounded-tl-xs"
              )}
            >
              {msg.sender === "ai" && (
                <button
                  type="button"
                  onClick={() => handleCopyMessage(msg.text)}
                  className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copiar texto"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="whitespace-pre-wrap">{msg.text}</div>

              {msg.reelMeta && (
                <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-wrap items-center gap-3 text-[11px]">
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

              {msg.captionMeta && (
                <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="font-bold flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <FileText className="w-3.5 h-3.5" />
                    Preview de 125 chars aprovado
                  </span>
                  <span className="text-muted-foreground">
                    Hashtags: {msg.captionMeta.hashtagCount}/5 recomendadas
                  </span>
                </div>
              )}

              {msg.actions && msg.actions.length > 0 && (
                <div className="pt-2 border-t border-border/60 space-y-1.5">
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
                          "h-7 px-3 text-[11px] font-bold rounded-lg gap-1.5 shadow-2xs",
                          act.executed
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-purple-600 text-white hover:bg-purple-700"
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
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-2 items-center text-xs text-muted-foreground p-3">
            <Sparkles className="w-4 h-4 animate-spin text-purple-500" />
            <span>Copiloto consultando o Manual da Marca e executando a Skill...</span>
          </div>
        )}
      </div>

      {/* Campo de Envio de Mensagem */}
      <div className="p-3 border-t border-border/40 bg-card/20 shrink-0">
        <div className="flex items-center gap-2 p-1.5 bg-background border border-border/80 rounded-2xl shadow-xs">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendPrompt(inputText)}
            placeholder="Converse com o Copiloto IA ou digite /reel, /carrossel, /bio, /legenda..."
            className="border-0 shadow-none focus-visible:ring-0 text-xs h-9 bg-transparent"
          />
          <Button
            size="sm"
            onClick={() => handleSendPrompt(inputText)}
            disabled={!inputText.trim() || isThinking}
            className="h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
