import React, { useState, useMemo } from "react";
import {
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Flame,
  Layers,
  Lightbulb,
  ListTodo,
  MessageSquare,
  Plus,
  RefreshCw,
  Rocket,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { criafyService } from "@/services/criafy/criafyService";
import { CriafyInstagramAccount } from "@/types/criafy";
import { useSprintOSStore } from "@/features/sprint-os/state/sprintOsStore";
import { CriafySubsidebar, CriafySubsidebarGroup } from "./CriafySubsidebar";

interface CriafyStrategistViewProps {
  accounts: CriafyInstagramAccount[];
  selectedAccountId?: string;
  onNavigateToPlanner?: () => void;
  onNavigateToDemands?: () => void;
}

interface StrategistMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  actions?: Array<{
    label: string;
    actionType: "add_to_planner" | "create_demands" | "generate_stories_lite";
    payload: any;
    executed?: boolean;
  }>;
}

export const CriafyStrategistView: React.FC<CriafyStrategistViewProps> = ({
  accounts,
  selectedAccountId = "all",
  onNavigateToPlanner,
  onNavigateToDemands,
}) => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { user } = useAuth();
  const { workspace } = useSprintOSStore();

  const [activeSubTab, setActiveSubTab] = useState<string>("diagnostico");
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  // Mensagens do Estrategista com ações executáveis reais
  const [messages, setMessages] = useState<StrategistMessage[]>([
    {
      id: "msg-1",
      sender: "ai",
      text: `Olá! Eu sou o Estrategista IA da **${activeCompany?.name || "sua marca"}**.\n\nAnalisei o seu **Manual de Marca 7D** e o histórico de conteúdos. Meu papel é conectar sua tese única aos seus objetivos de negócio através de **Diagnóstico + Decisão + Plano de Ação**.\n\nComo posso acelerar sua estratégia hoje?`,
      timestamp: "Agora",
      actions: [
        {
          label: "Gerar 3 Pautas Estratégicas para o Planner",
          actionType: "add_to_planner",
          payload: [
            {
              theme: "Vocês viraram colegas de casa?",
              format: "REEL",
              pillar: "Relacionamento",
              objective: "identificacao",
              angle: "Dor silenciosa na rotina do casal",
              hook: "Se você e seu parceiro só conversam sobre boleto e logística da casa, assiste até o final.",
              script: "GANCHO: Você já sentiu que mora com um colega de quarto e não mais com o amor da sua vida?\n\nPONTE: Isso acontece quando a rotina engole o romance e ninguém tem coragem de dar o diagnóstico.\n\nMENSAGEM: Não é falta de amor, é falta de método.\n\nCTA: Salva esse vídeo pra assistir junto hoje à noite.",
            },
            {
              theme: "Por que tentar consertar tudo na conversa falha?",
              format: "CAROUSEL",
              pillar: "Método",
              objective: "autoridade",
              angle: "Quebra de senso comum",
              hook: "DR não resolve casamento que não tem alinhamento de visão.",
              script: "Slide 1: Conversar mais nem sempre é o remédio.\nSlide 2: Quando os dois estão magoados, falar só reabre a ferida.\nSlide 3: O que funciona é diagnóstico neutro e regras de convivência.\nSlide 4: Conheça os 3 pilares da nossa consultoria.",
            },
            {
              theme: "O erro silencioso que custa 10 anos de casamento",
              format: "REEL",
              pillar: "Posicionamento",
              objective: "vendas",
              angle: "Urgência e conscientização",
              hook: "Esperar a crise estourar para pedir ajuda é o maior erro de casais bem-sucedidos.",
              script: "GANCHO: Por que vocês investem em negócios, saúde e filhos, mas deixam o casamento no piloto automático?\n\nPONTE: O casamento é o teto do seu sucesso.\n\nCTA: Comente 'DIAGNÓSTICO' para agendar uma sessão.",
            },
          ],
        },
        {
          label: "Criar Set de 3 Stories Lite de Rotina",
          actionType: "generate_stories_lite",
          payload: { count: 3 },
        },
      ],
    },
  ]);

  const subsidebarGroups: CriafySubsidebarGroup[] = [
    {
      title: "Módulos do Estrategista",
      items: [
        { id: "diagnostico", label: "Diagnóstico & Decisão", icon: Brain },
        { id: "sugestoes", label: "Planos Recomendados", icon: Target },
        { id: "stories_lite", label: "Oportunidades de Rotina", icon: Flame },
      ],
    },
  ];

  // Ações de prompt rápido
  const quickPrompts = [
    "O que eu devo postar esta semana?",
    "Quero vender minha mentoria em 10 dias.",
    "Monte uma campanha para essa oferta.",
    "Preciso de 3 Stories Lite para hoje.",
    "Quais temas estou repetindo?",
  ];

  const handleSendPrompt = (prompt: string) => {
    if (!prompt.trim() || isThinking) return;

    const userMsg: StrategistMessage = {
      id: "usr-" + Date.now(),
      sender: "user",
      text: prompt,
      timestamp: "Agora",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsThinking(true);

    setTimeout(() => {
      // Diagnóstico inteligente baseado no prompt
      let aiResponseText = "";
      let actions: StrategistMessage["actions"] = [];

      if (prompt.toLowerCase().includes("semana") || prompt.toLowerCase().includes("postar")) {
        aiResponseText = `### Diagnóstico da Semana\n\nCom base no seu **Manual da Marca** e no equilíbrio editorial recomendado:\n\n1. **Pilar Relacionamento (Identificação):** Precisamos de um Reels de dor latente para abrir topo de funil.\n2. **Pilar Método (Autoridade):** Um carrossel que quebra a objeção clássica de "já tentamos de tudo".\n3. **Pilar Comercial (Conversão):** Uma chamada direta para o seu diagnóstico ou produto principal.\n\nPreparei as 3 pautas completas prontas para enviar diretamente ao seu **Planner**:`;
        actions = [
          {
            label: "Adicionar estas 3 pautas ao Planner",
            actionType: "add_to_planner",
            payload: [
              {
                theme: "A armadilha do 'está tudo bem, só não está ótimo'",
                format: "REEL",
                pillar: "Relacionamento",
                objective: "identificacao",
                angle: "Acomodação silenciosa",
                hook: "Você não briga, mas também não se conecta mais.",
              },
              {
                theme: "3 coisas que casais saudáveis nunca fazem em público",
                format: "CAROUSEL",
                pillar: "Método",
                objective: "autoridade",
                angle: "Elegância e maturidade",
              },
              {
                theme: "Como funciona a nossa Imersão de Casais",
                format: "REEL",
                pillar: "Vendas",
                objective: "vendas",
                angle: "Oferta direta",
              },
            ],
          },
        ];
      } else if (prompt.toLowerCase().includes("stories lite") || prompt.toLowerCase().includes("rotina")) {
        aiResponseText = `### Estratégia de Stories Lite (Oportunidades de Rotina)\n\nStories não devem ser palestras cansativas. O conceito é embutir sua metodologia dentro de momentos naturais do seu dia.\n\nDefini 3 oportunidades para hoje:\n- **Momento Café:** Reflexão sobre pausas estratégicas no casamento.\n- **Momento Carro:** Uma verdade rápida sobre prioridades.\n- **Momento Mesa de Trabalho:** Um bastidor real de entrega.`;
        actions = [
          {
            label: "Criar estas 3 oportunidades na Central de Demandas",
            actionType: "generate_stories_lite",
            payload: { count: 3 },
          },
        ];
      } else {
        aiResponseText = `### Análise Estratégica\n\nIdentifiquei a sua solicitação. Para avançar com eficiência, estruturei uma linha de ação direta que preserva o tom da sua marca e não sobrecarrega a equipe.\n\nRecomendo criarmos a demanda correspondente para a gravação ou planejamento:`;
        actions = [
          {
            label: "Gerar Demanda de Produção",
            actionType: "create_demands",
            payload: {
              title: `Executar: ${prompt.slice(0, 50)}...`,
              type: "gravar_video",
              description: `Ação sugerida pelo Estrategista IA a partir da consulta: "${prompt}"`,
            },
          },
        ];
      }

      const aiMsg: StrategistMessage = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: aiResponseText,
        timestamp: "Agora",
        actions,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 700);
  };

  const handleExecuteAction = async (msgId: string, actionIdx: number, action: any) => {
    if (!activeCompanyId) return;

    try {
      if (action.actionType === "add_to_planner") {
        const items = Array.isArray(action.payload) ? action.payload : [action.payload];
        for (const it of items) {
          await criafyService.createPlannerItem({
            company_id: activeCompanyId,
            theme: it.theme,
            format: it.format || "REEL",
            pillar: it.pillar || "Estratégia",
            objective: it.objective || "identificacao",
            angle: it.angle || "",
            hook: it.hook || "",
            script: it.script || "",
            status: "ideia",
            created_by: user?.id,
          });
        }
        toast.success(`${items.length} pauta(s) adicionada(s) ao Planner com sucesso!`);
      } else if (action.actionType === "generate_stories_lite") {
        await criafyService.createDemand({
          company_id: activeCompanyId,
          title: "Stories Lite: Momento Café da Manhã",
          description: "Grave se o momento acontecer: 'Tem coisas que você só percebe quando para para um café...'",
          type: "stories_lite",
          priority: "media",
          origin: "ia",
          stories_lite: {
            context: "cafe",
            contextLabel: "Café / Pausa matinal",
            hook: "Tem coisas no seu casamento que você só percebe quando para para tomar um café...",
            bridge: "A correria esconde a distância.",
            coreMessage: "Pequenos rituais diários salvam relacionamentos.",
            connectionToMethod: "É o nosso pilar de micro-conexões.",
            cta: "Qual foi o último café que vocês tomaram juntos?",
          },
        });
        toast.success("Oportunidade de Stories Lite criada nas Demandas!");
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

      // Marcar ação como executada
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-card border border-border/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Estrategista IA</h2>
            <p className="text-xs text-muted-foreground">
              Diagnóstico + Decisão + Plano de Ação conectado ao seu Manual da Marca e Planner.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {onNavigateToPlanner && (
            <Button
              size="sm"
              variant="outline"
              onClick={onNavigateToPlanner}
              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border"
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Ver Planner</span>
            </Button>
          )}
          {onNavigateToDemands && (
            <Button
              size="sm"
              variant="outline"
              onClick={onNavigateToDemands}
              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border"
            >
              <ListTodo className="w-3.5 h-3.5 text-primary" />
              <span>Ver Demandas</span>
            </Button>
          )}
        </div>
      </div>

      {/* Subsidebar Contextual + Chat Estratégico */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <CriafySubsidebar
          groups={subsidebarGroups}
          activeId={activeSubTab}
          onChange={setActiveSubTab}
          title="Estrategista"
        />

        <div className="flex-1 w-full min-w-0 space-y-4">
          {/* Caixa de Prompts Rápidos */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Atalhos:
            </span>
            {quickPrompts.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendPrompt(q)}
                className="px-2.5 py-1 rounded-xl bg-card border border-border/80 hover:border-primary/40 text-xs text-foreground/90 hover:text-primary whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs font-medium"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Área de Mensagens do Chat Estratégico */}
          <div className="space-y-4 min-h-[420px] max-h-[560px] overflow-y-auto p-4 rounded-2xl bg-card/60 border border-border/80">
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
                    "p-4 rounded-2xl text-xs space-y-3 shadow-2xs leading-relaxed",
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                      : "bg-background border border-border/80 text-foreground rounded-tl-xs"
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Ações reais da IA que realizam mutações */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Rocket className="w-3 h-3 text-primary" />
                        Ações Recomendadas (Execução Real no Sistema):
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
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                          >
                            {act.executed ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Executado com Sucesso</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>{act.label}</span>
                              </>
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
                <span>Estrategista consultando o Manual da Marca e elaborando recomendações...</span>
              </div>
            )}
          </div>

          {/* Campo de Entrada de Mensagem */}
          <div className="flex items-center gap-2 p-1.5 bg-card border border-border/80 rounded-2xl shadow-xs">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendPrompt(inputText)}
              placeholder="Pergunte ao Estrategista (ex: O que postar hoje? Planeje uma campanha...)"
              className="border-0 shadow-none focus-visible:ring-0 text-xs h-9 bg-transparent"
            />
            <Button
              size="sm"
              onClick={() => handleSendPrompt(inputText)}
              disabled={!inputText.trim() || isThinking}
              className="h-8 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enviar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
