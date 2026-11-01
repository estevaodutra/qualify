import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  PlayCircle,
  Sparkles,
  Layers,
  Wrench,
  Workflow,
  Bot,
  Building2,
  Zap,
  Clock,
  DollarSign,
  AlertCircle,
  Copy,
  Loader2,
  RefreshCw,
  ArrowRight,
  BookOpen,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Film,
  Check,
  Compass,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import {
  CriafySeedContentService,
  isBrandManualPopulated,
} from "@/services/criafy/criafySeedContentService";
import {
  QualifyAI,
  ALL_TOOLS,
  PREPARED_AGENTS,
  PREPARED_SKILLS,
  WorkflowRegistry,
  ModelProfileCode,
} from "@/ai";
import {
  indexBrandManual,
  getBrandManualEmbeddingStatus,
  EmbeddingIndexStatus,
} from "@/services/ai/brandManualEmbeddingService";

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metrics?: {
    latency_ms: number;
    tokens_total: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    estimated_cost: number;
    model: string;
  };
  tool_calls?: any[];
  executed_tools?: any[];
  context_summary?: string;
  agent_path?: {
    input_eval: string;
    routing_decision: string;
    action_taken: string;
    rag_chunks?: string[];
  };
  trace?: any;
  raw_response?: any;
}

export default function AdminAiPlayground() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Aba principal: 'chat' (Padrão) | 'technical' (Inspeção Técnica / Workflows)
  const [mainTab, setMainTab] = useState<"chat" | "technical">("chat");

  // Modo Técnico legado: Workflow | Agent | Skill | Tool
  const [playMode, setPlayMode] = useState<"workflow" | "agent" | "skill" | "tool">("agent");

  // Seletores de Tenant e Modelos
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("demo-company-1");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("none");
  const [selectedModelProfile, setSelectedModelProfile] = useState<ModelProfileCode>("CONTENT_STANDARD");
  const [selectedAgentSlug, setSelectedAgentSlug] = useState<string>("qualify-orchestrator");
  const [selectedWorkflowSlug, setSelectedWorkflowSlug] = useState<string>("create_strategic_reel");
  const [selectedSkillSlug, setSelectedSkillSlug] = useState<string>("ig-reel");
  const [selectedToolName, setSelectedToolName] = useState<string>("company.get_brand_manual");

  // Inputs Técnicos Legados
  const [ideaPrompt, setIdeaPrompt] = useState("Como estruturar um funil de qualificação de leads com IA");
  const [objective, setObjective] = useState("Autoridade e conversão qualificada");
  const [toolInputJson, setToolInputJson] = useState(JSON.stringify({ company_id: "demo-company-1" }, null, 2));

  // Chat do Orquestrador
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados de Execução
  const [executing, setExecuting] = useState(false);
  const [executingSeed, setExecutingSeed] = useState(false);
  const [isIndexingRag, setIsIndexingRag] = useState(false);
  const [ragStatus, setRagStatus] = useState<EmbeddingIndexStatus>(() =>
    getBrandManualEmbeddingStatus(selectedCompanyId)
  );
  const [resultData, setResultData] = useState<any>(null);
  const [traceData, setTraceData] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Chave OpenAI personalizada salva em localStorage
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem("qualify_openai_test_key") || "";
    } catch {
      return "";
    }
  });

  const handleKeyChange = (val: string) => {
    setCustomApiKey(val);
    try {
      localStorage.setItem("qualify_openai_test_key", val.trim());
    } catch {}
  };

  // Status da Chave OpenAI na Plataforma
  const { data: openAiConfig } = useQuery({
    queryKey: ["admin_ai_config_playground"],
    queryFn: async () => {
      try {
        return await AIExecutionService.getOpenAiConfig();
      } catch {
        return null;
      }
    },
  });

  const isKeyConfigured = Boolean(
    openAiConfig?.configured ||
    openAiConfig?.status === "active" ||
    openAiConfig?.status === "configured" ||
    (customApiKey && customApiKey.trim().length > 8)
  );

  // Carregar Empresas do Sistema
  const { data: companies = [] } = useQuery({
    queryKey: ["admin_companies_list_playground"],
    queryFn: async () => {
      try {
        const { data } = await (supabase as any)
          .from("companies")
          .select("id, name")
          .order("name");
        return data || [];
      } catch {
        return [];
      }
    },
  });

  // Auto-selecionar primeira empresa real se disponível
  useEffect(() => {
    if (companies.length > 0 && selectedCompanyId === "demo-company-1") {
      const ipvCompany = companies.find((c: any) =>
        c.name?.toLowerCase().includes("ipv")
      );
      if (ipvCompany) {
        setSelectedCompanyId(ipvCompany.id);
      }
    }
  }, [companies]);

  // Atualizar status de Embeddings quando o tenant mudar
  useEffect(() => {
    setRagStatus(getBrandManualEmbeddingStatus(selectedCompanyId));
  }, [selectedCompanyId]);

  const handleIndexManual = async () => {
    if (!isKeyConfigured) {
      toast.error("Chave da OpenAI não configurada. Insira sua chave sk-proj-... no painel esquerdo.");
      return;
    }
    if (!brandManualCheck?.isFilled) {
      toast.error("Manual da Marca não preenchido para esta empresa.");
      return;
    }

    try {
      setIsIndexingRag(true);
      toast.info("Gerando embeddings do Manual da Marca com OpenAI (text-embedding-3-small)...");
      const res = await indexBrandManual(selectedCompanyId, customApiKey.trim() || undefined);
      setRagStatus(getBrandManualEmbeddingStatus(selectedCompanyId));
      toast.success(`Embeddings gerados! ${res.total_chunks} chunks vetoriais prontos para o Orquestrador.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao gerar embeddings do Manual.");
    } finally {
      setIsIndexingRag(false);
    }
  };

  // Contas de Instagram da Empresa Selecionada
  const { data: companyAccounts = [] } = useQuery({
    queryKey: ["admin_company_accounts_playground", selectedCompanyId],
    enabled: Boolean(selectedCompanyId && selectedCompanyId !== "demo-company-1"),
    queryFn: async () => {
      try {
        const { data } = await (supabase as any)
          .from("criafy_instagram_accounts")
          .select("id, name, username, profile_picture_url")
          .eq("company_id", selectedCompanyId)
          .eq("is_active", true);
        return data || [];
      } catch {
        return [];
      }
    },
  });

  // Auto-selecionar primeira conta quando a empresa mudar
  useEffect(() => {
    if (companyAccounts.length > 0) {
      if (selectedAccountId === "none" || !selectedAccountId || !companyAccounts.some((a: any) => a.id === selectedAccountId)) {
        setSelectedAccountId(companyAccounts[0].id);
      }
    } else if (selectedCompanyId === "demo-company-1") {
      setSelectedAccountId("demo-account-1");
    } else {
      setSelectedAccountId("none");
    }
  }, [selectedCompanyId, companyAccounts]);

  // REGRA DE NEGÓCIO: Verificação do Manual da Marca da Empresa
  const { data: brandManualCheck, isLoading: isCheckingBrandManual } = useQuery({
    queryKey: ["admin_brand_manual_check_playground", selectedCompanyId],
    enabled: Boolean(selectedCompanyId),
    queryFn: async () => {
      if (selectedCompanyId === "demo-company-1") {
        return {
          isFilled: true,
          brandName: "Qualify Demo",
          toneOfVoice: "Autoridade, direto e pragmático",
          answeredCount: 12,
          details: "Manual da Marca de demonstração ativo",
        };
      }

      try {
        const { data: workspaces } = await (supabase as any)
          .from("sprint_os_workspaces")
          .select("id, name, data, updated_at")
          .eq("company_id", selectedCompanyId)
          .is("archived_at", null)
          .order("updated_at", { ascending: false });

        let bestManual: any = null;
        let bestAnsweredCount = 0;
        let bestBrandName = "";
        let bestTone = "";

        if (Array.isArray(workspaces)) {
          for (const ws of workspaces) {
            const bm = ws?.data?.brandManual;
            if (bm) {
              const fields = Array.isArray(bm.fields) ? bm.fields : [];
              const answered = fields.filter((f: any) => {
                const resp = f?.response || f?.value || f?.answer || f?.transcription || "";
                return typeof resp === "string" && resp.trim().length > 0 && !f.archived;
              });

              if (answered.length > bestAnsweredCount) {
                bestAnsweredCount = answered.length;
                bestManual = bm;
                bestBrandName = ws?.name || ws?.data?.name || ws?.data?.project?.name || "";
              } else if (!bestManual && isBrandManualPopulated(bm)) {
                bestManual = bm;
                bestBrandName = ws?.name || ws?.data?.name || ws?.data?.project?.name || "";
              }
            }
          }
        }

        // Fallback localStorage
        if (!bestManual && typeof localStorage !== "undefined") {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(`sprint_os_ws_${selectedCompanyId}`) || key.startsWith("sprint_os_ws_"))) {
              try {
                const item = JSON.parse(localStorage.getItem(key) || "{}");
                const bm = item?.brandManual;
                if (isBrandManualPopulated(bm)) {
                  bestManual = bm;
                  const fields = Array.isArray(bm.fields) ? bm.fields : [];
                  bestAnsweredCount = fields.filter((f: any) => {
                    const resp = f?.response || f?.value || f?.answer || "";
                    return typeof resp === "string" && resp.trim().length > 0;
                  }).length;
                  bestBrandName = item?.project?.name || item?.name || "Local";
                  break;
                }
              } catch {}
            }
          }
        }

        // Fallback account briefings
        if (!bestManual) {
          const { data: briefings } = await (supabase as any)
            .from("criafy_account_briefings")
            .select("brand_name, tone_of_voice, brand_positioning")
            .limit(1);

          if (briefings && briefings.length > 0) {
            const b = briefings[0];
            bestManual = {
              brandName: b.brand_name,
              toneOfVoice: b.tone_of_voice,
              positioning: b.brand_positioning,
            };
            bestBrandName = b.brand_name || "";
            bestTone = b.tone_of_voice || "";
          }
        }

        const isFilled = isBrandManualPopulated(bestManual);

        return {
          isFilled,
          answeredCount: bestAnsweredCount,
          brandName: bestBrandName || (isFilled ? "Manual Ativo" : "Não informado"),
          toneOfVoice: bestTone || bestManual?.toneOfVoice || (isFilled ? "Definido" : "Não informado"),
          details: isFilled
            ? `${bestAnsweredCount > 0 ? `${bestAnsweredCount} perguntas respondidas` : "Manual da Marca concluído"}`
            : "Nenhuma informação ou pergunta respondida no Manual da Marca.",
        };
      } catch (err) {
        console.warn("Erro ao checar manual da marca:", err);
        return {
          isFilled: false,
          answeredCount: 0,
          brandName: "Erro na verificação",
          toneOfVoice: "",
          details: "Não foi possível validar o manual da marca.",
        };
      }
    },
  });

  // Scroll automático para a última mensagem no Chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, executing]);

  // Enviar mensagem para o Orquestrador
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || chatInput).trim();
    if (!textToSend || executing) return;

    if (!isKeyConfigured) {
      toast.error("Chave da OpenAI não configurada. Insira sua chave sk-proj-... no painel esquerdo.");
      return;
    }

    if (!brandManualCheck?.isFilled) {
      toast.error("Manual da Marca não preenchido para este Tenant. Preencha o manual para ancorar as respostas.");
      return;
    }

    const userMessage: ChatMessageItem = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...chatMessages, userMessage];
    setChatMessages(newHistory);
    setChatInput("");
    setExecuting(true);
    setErrorDetails(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      // Montar histórico para envio ao LangChain
      const historyForAi = newHistory.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await QualifyAI.runAgent({
        agentSlug: selectedAgentSlug || "qualify-orchestrator",
        prompt: textToSend,
        context: {
          company_id: selectedCompanyId,
          account_id: selectedAccountId !== "none" ? selectedAccountId : undefined,
          user_id: userId,
        },
        apiKey: customApiKey.trim() || undefined,
        modelProfile: selectedModelProfile,
        chatHistory: historyForAi,
      });

      const agentData = result.data;
      const brandContext = agentData.context?.["company_brand_manual"];
      const executed = agentData.executed_tools || [];
      const ragTool = executed.find((t: any) => t.tool.includes("search_brand_manual"));

      let inputEval = "Saudação simples ou interação direta detectada.";
      let routingDecision = "Resposta direta sem necessidade de busca vetorial.";
      let actionTaken = "Nenhuma tool acionada • 0 tokens extras de contexto.";
      let ragChunks: string[] = [];

      if (ragTool) {
        inputEval = `Demanda de conteúdo/estratégia identificada (Foco: "${ragTool.input?.query || textToSend}").`;
        routingDecision = "Acionamento do RAG Vetorial (Embeddings) no Manual da Marca.";
        ragChunks = ragTool.output?.retrieved_topics || [];
        actionTaken = `Recuperados ${ragChunks.length} chunks relevantes (${ragTool.output?.estimated_tokens || 180} tokens via text-embedding-3-small).`;
      } else if (executed.length > 0) {
        inputEval = "Demanda operacional identificada.";
        routingDecision = `Roteamento para ferramenta especializada (${executed[0].tool}).`;
        actionTaken = `Executada em ${executed[0].latency_ms}ms com sucesso.`;
      } else if (textToSend.length > 30) {
        inputEval = "Consulta analítica ou orientação estratégica.";
        routingDecision = "Processamento com raciocínio executivo do Orquestrador.";
        actionTaken = "Análise direta com base nas diretrizes gerais.";
      }

      const aiMessage: ChatMessageItem = {
        id: `msg_ai_${Date.now()}`,
        role: "assistant",
        content: agentData.content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        metrics: agentData.metrics,
        tool_calls: agentData.tool_calls,
        executed_tools: executed,
        context_summary: brandContext?.brand_name
          ? `RAG: ${brandContext.brand_name} (${brandContext.answered_questions_count} respostas indexadas)`
          : "Contexto Base do Tenant",
        agent_path: {
          input_eval: inputEval,
          routing_decision: routingDecision,
          action_taken: actionTaken,
          rag_chunks: ragChunks,
        },
        trace: result.trace,
        raw_response: agentData,
      };

      setChatMessages((prev) => [...prev, aiMessage]);
      setResultData(agentData);
      setTraceData(result.trace);
    } catch (err: any) {
      console.error("[Playground Chat Error]:", err);
      const errMsg = err?.message || "Erro de comunicação com a OpenAI.";
      setErrorDetails(errMsg);
      toast.error(errMsg);

      const errorMessage: ChatMessageItem = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Falha na Execução**: ${errMsg}\n\nVerifique se sua chave da OpenAI possui saldo ativo e permissões suficientes.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setExecuting(false);
    }
  };

  // Gerar Conteúdo Semente da Empresa (Marco Zero)
  const handleGenerateSeedContent = async () => {
    if (!isKeyConfigured) {
      toast.error("Chave da OpenAI não configurada. Insira sua chave sk-proj-... no painel esquerdo.");
      return;
    }
    if (!brandManualCheck?.isFilled) {
      toast.error("Manual da Marca não preenchido para esta empresa.");
      return;
    }

    try {
      setExecutingSeed(true);
      setErrorDetails(null);
      const targetAccountId = selectedAccountId !== "none" ? selectedAccountId : null;
      const startTime = Date.now();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      toast.info("Iniciando geração do Pacote Semente...");

      // 1. Inicializar pacote semente no banco
      const seedResult = await CriafySeedContentService.startSeedContent(
        selectedCompanyId,
        targetAccountId,
        userId
      );

      // 2. Gerar roteiro do Reel Semente com a OpenAI
      let reelRes: any = null;
      let generatedReel: any = null;
      const reelItem = seedResult.items.find((i) => i.format === "REEL");
      if (reelItem) {
        reelRes = await QualifyAI.createStrategicReel({
          company_id: selectedCompanyId,
          account_id: targetAccountId || undefined,
          user_id: userId,
          idea: reelItem.theme || "Reel Semente — Método e Posicionamento",
          objective: "Apresentar o método e autoridade da marca",
          apiKey: customApiKey.trim() || undefined,
          modelProfile: selectedModelProfile,
        });
        generatedReel = reelRes.data;
      }

      setResultData({
        type: "SEED_CONTENT_PACKAGE",
        activation: seedResult.activation,
        items: seedResult.items,
        demands: seedResult.demands,
        generatedReel,
      });

      setTraceData({
        run_id: reelRes?.trace?.run_id || `seed_content_${Date.now()}`,
        latency_ms: Date.now() - startTime,
        model: selectedModelProfile,
        tokens_total: reelRes?.trace?.tokens_total || 0,
        estimated_cost: reelRes?.trace?.estimated_cost || 0,
        status: "success",
      });

      // Adicionar resposta no Chat
      const seedMsg: ChatMessageItem = {
        id: `msg_seed_${Date.now()}`,
        role: "assistant",
        content: `### 🌱 Pacote de Conteúdo Semente Criado com Sucesso!\n\nForam mapeadas e registradas **5 peças operacionais no Planner da Criafy**:\n- 🎬 **Reel Semente (Método)**: "${generatedReel?.selected_hook || 'Roteiro gerado'}"\n- ⭐ **Destaque Semente**: Posicionamento & Promessa\n- 🖼️ **Post 01**: Posicionamento\n- 🖼️ **Post 02**: Problema / Visão\n- 🖼️ **Post 03**: Método / Solução\n\nVocê pode me pedir agora para aprofundar qualquer um desses posts ou ajustar o gancho!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        metrics: {
          latency_ms: Date.now() - startTime,
          tokens_total: reelRes?.trace?.tokens_total || 520,
          estimated_cost: reelRes?.trace?.estimated_cost || 0.0002,
          model: selectedModelProfile,
        },
      };

      setChatMessages((prev) => [...prev, seedMsg]);
      toast.success("Conteúdo Semente gerado e adicionado ao Chat!");
    } catch (err: any) {
      console.error(err);
      setErrorDetails(err.message || "Erro ao gerar Conteúdo Semente.");
      toast.error(err.message || "Falha ao gerar Conteúdo Semente.");
    } finally {
      setExecutingSeed(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setChatMessages([]);
    setResultData(null);
    setTraceData(null);
    setErrorDetails(null);
    toast.info("Histórico do chat limpo.");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Playground Central de IA</h1>
            <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
              Agente Orquestrador Ativo
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ambiente conversacional e interativo para interrogar o Orquestrador, testar skills e aprofundar estratégias.
          </p>
        </div>

        {/* Alternador de Visualização: Chat vs Inspeção Técnica */}
        <div className="flex bg-muted p-1 rounded-xl">
          <Button
            size="sm"
            variant={mainTab === "chat" ? "default" : "ghost"}
            className="text-xs gap-1.5 h-8 font-medium cursor-pointer"
            onClick={() => setMainTab("chat")}
          >
            <Bot className="h-3.5 w-3.5" /> Chat com Orquestrador
          </Button>
          <Button
            size="sm"
            variant={mainTab === "technical" ? "default" : "ghost"}
            className="text-xs gap-1.5 h-8 font-medium cursor-pointer"
            onClick={() => setMainTab("technical")}
          >
            <Cpu className="h-3.5 w-3.5" /> Inspeção Técnica / Modos
          </Button>
        </div>
      </div>

      {/* Grid Principal: Painel de Controle (Esquerda) + Chat Interativo (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Lateral de Parâmetros e Contexto do Tenant */}
        <Card className="lg:col-span-4 flex flex-col justify-between shadow-xs">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Contexto & Credenciais</span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {selectedModelProfile}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Tenant ativo e validação do Manual da Marca.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4 text-xs">
            {/* Seletor de Tenant */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">Empresa (Tenant)</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione empresa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo-company-1">Empresa Demonstração</SelectItem>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status do Manual da Marca */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold block">Status do Manual da Marca</Label>
              {isCheckingBrandManual ? (
                <div className="p-2.5 rounded-lg border bg-muted/40 flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando Manual da Marca...
                </div>
              ) : brandManualCheck?.isFilled ? (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                      <BookOpen className="h-3.5 w-3.5" /> Manual da Marca Preenchido
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                      {brandManualCheck.answeredCount} respostas
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    <strong className="text-foreground">Projeto:</strong> {brandManualCheck.brandName}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug truncate">
                    <strong className="text-foreground">Tom:</strong> {brandManualCheck.toneOfVoice}
                  </p>

                  {/* Status do RAG & Embeddings */}
                  <div className="pt-2 mt-1 border-t border-emerald-500/20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-medium text-foreground">
                        {ragStatus.isIndexed
                          ? `RAG: ${ragStatus.totalChunks} chunks indexados`
                          : "Embeddings pendentes"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isIndexingRag}
                      onClick={handleIndexManual}
                      className="h-5 px-1.5 text-[9px] gap-1 cursor-pointer text-primary hover:bg-primary/10"
                    >
                      {isIndexingRag ? (
                        <>
                          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Indexando...
                        </>
                      ) : ragStatus.isIndexed ? (
                        <>
                          <RefreshCw className="h-2.5 w-2.5" /> Re-indexar
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-2.5 w-2.5" /> Indexar Agora
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 space-y-1.5 text-destructive">
                  <div className="flex items-center justify-between font-semibold text-xs">
                    <span>Manual Não Preenchido</span>
                    <Badge variant="destructive" className="text-[9px]">Bloqueado</Badge>
                  </div>
                  <p className="text-[11px] leading-tight opacity-90">
                    O Orquestrador precisa das diretrizes para fundamentar suas respostas.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/criafy?tab=brand-manual")}
                    className="w-full text-xs h-7 mt-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    Preencher Manual da Marca
                  </Button>
                </div>
              )}
            </div>

            {/* Perfil de Modelo OpenAI */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">Perfil de Modelo OpenAI</Label>
              <Select
                value={selectedModelProfile}
                onValueChange={(val) => setSelectedModelProfile(val as ModelProfileCode)}
              >
                <SelectTrigger className="h-9 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTENT_STANDARD">CONTENT_STANDARD (gpt-4o-mini)</SelectItem>
                  <SelectItem value="CONTENT_ADVANCED">CONTENT_ADVANCED (gpt-4o)</SelectItem>
                  <SelectItem value="STRATEGY_ADVANCED">STRATEGY_ADVANCED (o1-mini / o3)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conexão OpenAI */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Conexão OpenAI
                </span>
                {isKeyConfigured ? (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                    Conectada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-destructive bg-destructive/10 border-destructive/30">
                    Sem chave
                  </Badge>
                )}
              </div>
              <Input
                type="password"
                value={customApiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="Insira sua chave sk-proj-... (salva localmente)"
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                * As requisições debitam e aparecem em tempo real no seu painel da OpenAI.
              </p>
            </div>

            {/* Ações de Apoio */}
            <div className="pt-2 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={clearChat}
              >
                <Trash2 className="h-3.5 w-3.5" /> Limpar Histórico do Chat
              </Button>

              <Button
                variant="default"
                size="sm"
                className="w-full text-xs h-8.5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium cursor-pointer"
                onClick={handleGenerateSeedContent}
                disabled={executingSeed || !brandManualCheck?.isFilled}
              >
                {executingSeed ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando Pacote Semente...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Gerar Conteúdo Semente (Marco Zero)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Painel Central: Chat Interativo com o Orquestrador */}
        {mainTab === "chat" ? (
          <Card className="lg:col-span-8 flex flex-col h-[750px] shadow-sm">
            {/* Header do Chat */}
            <CardHeader className="py-3 px-5 border-b flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground">Orquestrador Qualify</h2>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Diretor Estratégico • Ancorado no Manual da Marca ({brandManualCheck?.brandName || "Tenant"})
                  </p>
                </div>
              </div>

              {chatMessages.length > 0 && (
                <Badge variant="outline" className="text-[11px] font-mono">
                  {chatMessages.length} interações na sessão
                </Badge>
              )}
            </CardHeader>

            {/* Área de Mensagens (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Estado Vazio de Boas-vindas */}
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-lg mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-foreground">
                      Converse com o Orquestrador Qualify
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Eu sou o cérebro central da plataforma. Analiso o Manual da Marca do seu negócio,
                      roteio skills de conteúdo, estruturo ganchos, audito perfis e aprofundo estratégias.
                    </p>
                  </div>

                  <div className="w-full pt-3 space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Sugestões para começar:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      <button
                        onClick={() => handleSendMessage("Analise o nosso Manual da Marca e me dê um mapa com as 3 maiores dores dos Inconformados.")}
                        className="p-3 rounded-xl border bg-card hover:bg-muted/60 transition-all text-xs text-foreground font-medium cursor-pointer shadow-2xs hover:border-primary/40 text-left"
                      >
                        🎯 <span className="font-semibold">Mapear Dores:</span> Extrair as 3 dores dos Inconformados do Manual.
                      </button>

                      <button
                        onClick={() => handleSendMessage("Gere 3 opções de ganchos (hooks) de alta quebra de padrão para um Reel sobre nosso método único.")}
                        className="p-3 rounded-xl border bg-card hover:bg-muted/60 transition-all text-xs text-foreground font-medium cursor-pointer shadow-2xs hover:border-primary/40 text-left"
                      >
                        🔥 <span className="font-semibold">Ganchos de Reel:</span> 3 opções com quebra de padrão e alta retenção.
                      </button>

                      <button
                        onClick={() => handleSendMessage("Me dê um mapa com 3 headlines estratégicas para nosso produto com base no nosso posicionamento.")}
                        className="p-3 rounded-xl border bg-card hover:bg-muted/60 transition-all text-xs text-foreground font-medium cursor-pointer shadow-2xs hover:border-primary/40 text-left"
                      >
                        💡 <span className="font-semibold">3 Headlines:</span> Construir headlines de alta conversão.
                      </button>

                      <button
                        onClick={() => handleSendMessage("Quais são as ferramentas e skills que você tem disponíveis para auditar e produzir nosso conteúdo?")}
                        className="p-3 rounded-xl border bg-card hover:bg-muted/60 transition-all text-xs text-foreground font-medium cursor-pointer shadow-2xs hover:border-primary/40 text-left"
                      >
                        ⚙️ <span className="font-semibold">Capacidades:</span> Listar tools e habilidades disponíveis.
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagens do Histórico */}
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-4 space-y-2.5 text-xs shadow-2xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-xs"
                        : "bg-card border border-border rounded-bl-xs"
                    }`}
                  >
                    {/* Header de Metadados / Transparência da Decisão do Agente */}
                    {msg.role === "assistant" && msg.metrics && (
                      <div className="pb-2.5 mb-2 border-b border-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 font-medium text-primary">
                          <Compass className="h-3.5 w-3.5" />
                          <span>Rastro de Decisão</span>
                          {msg.context_summary && (
                            <Badge variant="secondary" className="text-[10px] font-normal py-0 h-4">
                              {msg.context_summary}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-500" /> {msg.metrics.latency_ms}ms
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500" /> {msg.metrics.tokens_total} tokens
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Fluxo Agêntico Percorrido (3 Etapas Visíveis) */}
                    {msg.role === "assistant" && msg.agent_path && (
                      <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5 text-[11px] mb-2 animate-in fade-in duration-150">
                        <div className="font-semibold text-primary flex items-center gap-1.5 text-xs">
                          <Compass className="h-3.5 w-3.5" />
                          <span>Fluxo Agêntico Percorrido:</span>
                        </div>
                        <div className="space-y-1 pl-1 font-mono text-[10px]">
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold text-foreground shrink-0">1. Avaliação do Input:</span>
                            <span className="text-muted-foreground">{msg.agent_path.input_eval}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold text-foreground shrink-0">2. Decisão de Roteamento:</span>
                            <span className="text-muted-foreground">{msg.agent_path.routing_decision}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold text-foreground shrink-0">3. Ação & RAG:</span>
                            <span className="text-muted-foreground">{msg.agent_path.action_taken}</span>
                          </div>
                        </div>
                        {msg.agent_path.rag_chunks && msg.agent_path.rag_chunks.length > 0 && (
                          <div className="pt-1 flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-muted-foreground font-semibold">Chunks do Manual:</span>
                            {msg.agent_path.rag_chunks.map((ch, i) => (
                              <Badge key={i} variant="secondary" className="text-[9px] py-0 h-4 bg-muted text-foreground">
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Conteúdo da Mensagem com Formatação */}
                    <div className="whitespace-pre-wrap font-sans text-xs">
                      {msg.content}
                    </div>

                    {/* Botões de Ação na Mensagem */}
                    {msg.role === "assistant" && (
                      <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40">
                        <span>{msg.timestamp}</span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] gap-1 cursor-pointer"
                            onClick={() => handleCopy(msg.id, msg.content)}
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" /> Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copiar
                              </>
                            )}
                          </Button>

                          {msg.trace && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] gap-1 cursor-pointer"
                              onClick={() => setExpandedTraceId(expandedTraceId === msg.id ? null : msg.id)}
                            >
                              {expandedTraceId === msg.id ? (
                                <>
                                  <ChevronUp className="h-3 w-3" /> Ocultar Trace
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" /> Ver Trace
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rastro JSON Expandido */}
                    {expandedTraceId === msg.id && msg.raw_response && (
                      <div className="mt-2 p-2.5 rounded-lg bg-muted text-[10px] font-mono overflow-x-auto max-h-48 border">
                        <pre>{JSON.stringify(msg.raw_response, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Indicador de Processamento */}
              {executing && (
                <div className="flex items-start gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-card border text-xs text-muted-foreground space-y-2 shadow-2xs max-w-sm">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span>Orquestrador compilando resposta...</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Lendo o Manual da Marca do tenant, validando regras de posicionamento e consultando a OpenAI.
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar do Chat (Rodapé) */}
            <div className="p-4 border-t bg-card/60 backdrop-blur-xs shrink-0">
              <div className="flex items-end gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Converse com o Orquestrador ou peça um aprofundamento... (Enter para enviar, Shift+Enter para nova linha)"
                  className="text-xs resize-none min-h-[44px] max-h-32"
                  disabled={executing}
                />
                <Button
                  size="default"
                  className="h-11 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shrink-0 cursor-pointer"
                  onClick={() => handleSendMessage()}
                  disabled={executing || !chatInput.trim()}
                >
                  {executing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* Visualização de Inspeção Técnica e Workflows Isolados */
          <Card className="lg:col-span-8 flex flex-col justify-between shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Inspeção Técnica de Modos</CardTitle>
                  <CardDescription className="text-xs">
                    Teste isolado de Workflows LangGraph, Skills e Ferramentas avulsas.
                  </CardDescription>
                </div>

                <div className="flex bg-muted p-0.5 rounded-lg text-xs">
                  <Button
                    size="sm"
                    variant={playMode === "agent" ? "default" : "ghost"}
                    className="h-7 text-xs px-2"
                    onClick={() => setPlayMode("agent")}
                  >
                    Agent
                  </Button>
                  <Button
                    size="sm"
                    variant={playMode === "workflow" ? "default" : "ghost"}
                    className="h-7 text-xs px-2"
                    onClick={() => setPlayMode("workflow")}
                  >
                    Workflow
                  </Button>
                  <Button
                    size="sm"
                    variant={playMode === "tool" ? "default" : "ghost"}
                    className="h-7 text-xs px-2"
                    onClick={() => setPlayMode("tool")}
                  >
                    Tool
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {playMode === "agent" && (
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Agente Selecionado</Label>
                  <Select value={selectedAgentSlug} onValueChange={setSelectedAgentSlug}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PREPARED_AGENTS.map((a) => (
                        <SelectItem key={a.slug} value={a.slug}>
                          {a.name} ({a.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {playMode === "tool" && (
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Ferramenta (Tool)</Label>
                  <Select value={selectedToolName} onValueChange={setSelectedToolName}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_TOOLS.map((t) => (
                        <SelectItem key={t.name} value={t.name}>
                          {t.name} [{t.type}]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-semibold block">Instrução / Prompt</Label>
                <Textarea
                  value={ideaPrompt}
                  onChange={(e) => setIdeaPrompt(e.target.value)}
                  rows={4}
                  className="text-xs font-mono"
                />
              </div>

              <Button
                className="w-full text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                onClick={() => {
                  setMainTab("chat");
                  handleSendMessage(ideaPrompt);
                }}
              >
                <PlayCircle className="h-4 w-4 mr-1.5" /> Executar e Visualizar no Chat
              </Button>

              {resultData && (
                <div className="mt-4 p-3 rounded-xl bg-muted font-mono text-[11px] max-h-64 overflow-y-auto">
                  <pre>{JSON.stringify(resultData, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
