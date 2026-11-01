import { useState, useEffect } from "react";
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
  Instagram,
  Zap,
  Clock,
  DollarSign,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Copy,
  Code,
  FileText,
  Loader2,
  RefreshCw,
  ArrowRight,
  Database,
  Rocket,
  BookOpen,
  ShieldAlert,
  ExternalLink,
  Film,
  Check,
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
  DEFAULT_MODEL_PROFILES,
  ModelProfileCode,
} from "@/ai";

export default function AdminAiPlayground() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Modo: Workflow | Agent | Skill | Tool (Regra #23 do Master Prompt)
  const [playMode, setPlayMode] = useState<"workflow" | "agent" | "skill" | "tool">("workflow");

  // Seletores
  const [selectedWorkflowSlug, setSelectedWorkflowSlug] = useState<string>("create_strategic_reel");
  const [selectedAgentSlug, setSelectedAgentSlug] = useState<string>("InstagramAgent");
  const [selectedSkillSlug, setSelectedSkillSlug] = useState<string>("ig-reel");
  const [selectedToolName, setSelectedToolName] = useState<string>("ai.score_hook");
  const [selectedModelProfile, setSelectedModelProfile] = useState<ModelProfileCode>("CONTENT_STANDARD");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("demo-company-1");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("none");

  // Inputs
  const [ideaPrompt, setIdeaPrompt] = useState("Como estruturar um funil de qualificação de leads com IA");
  const [objective, setObjective] = useState("Autoridade e conversão qualificada");
  const [toolInputJson, setToolInputJson] = useState(
    JSON.stringify(
      {
        hooks: [
          "R$ 18.000 foi o que um erro de qualificação me custou.",
          "Pare de mandar proposta para quem não tem dinheiro.",
          "Ninguém te conta que seus leads não fecham por falta de processo.",
        ],
      },
      null,
      2
    )
  );

  // Estado de Execução
  const [executing, setExecuting] = useState(false);
  const [executingSeed, setExecutingSeed] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [traceData, setTraceData] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
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

  // Contas de Instagram da Empresa Selecionada
  const { data: companyAccounts = [], isLoading: isLoadingAccounts } = useQuery({
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
        // 1. Buscar TODOS os workspaces da empresa (não apenas limit(1))
        const { data: workspaces, error: wsError } = await (supabase as any)
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

        // 2. Fallback para LocalStorage se o usuário estiver editando em cache
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

        // 3. Fallback para Account Briefings da Criafy
        if (!bestManual) {
          const { data: briefings } = await (supabase as any)
            .from("criafy_account_briefings")
            .select("brand_name, tone_of_voice, brand_positioning")
            .limit(1);

          if (briefings && briefings.length > 0) {
            const b = briefings[0];
            if (b.brand_name || b.tone_of_voice || b.brand_positioning) {
              bestManual = {
                brandName: b.brand_name,
                toneOfVoice: b.tone_of_voice,
                positioning: b.brand_positioning,
              };
              bestBrandName = b.brand_name || "";
              bestTone = b.tone_of_voice || "";
            }
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const handleSaveGlobalKey = async () => {
    if (!customApiKey || customApiKey.trim().length < 10) {
      toast.error("Insira uma chave OpenAI válida (sk-proj-...) para salvar.");
      return;
    }
    setSavingKey(true);
    try {
      await AIExecutionService.saveOpenAiConfig({
        apiKey: customApiKey.trim(),
        defaultModel: "gpt-4o-mini",
        organizationId: "",
        maxDailySpend: 10,
        enableFallback: true,
      });
      toast.success("Chave OpenAI salva como padrão global no sistema!");
      queryClient.invalidateQueries({ queryKey: ["admin_ai_config_playground"] });
      queryClient.invalidateQueries({ queryKey: ["admin_ai_config"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar chave.");
    } finally {
      setSavingKey(false);
    }
  };

  // Execução do Runtime (Agent / Workflow / Skill / Tool)
  const handleExecute = async () => {
    // REGRA DE NEGÓCIO: O Manual da Marca precisa estar preenchido para qualquer execução
    if (!brandManualCheck?.isFilled) {
      toast.error("Regra de Negócio: O Manual da Marca desta empresa precisa estar preenchido antes de realizar qualquer execução.");
      return;
    }

    if (!isKeyConfigured) {
      toast.error("Chave da OpenAI não configurada. Insira sua chave (sk-proj-...) no campo 'Conexão OpenAI' ou salve-a no sistema.");
      return;
    }

    setExecuting(true);
    setErrorDetails(null);
    setResultData(null);
    setTraceData(null);

    const startTime = Date.now();
    try {
      if (playMode === "workflow") {
        const res = await QualifyAI.createStrategicReel({
          company_id: selectedCompanyId || "default-company",
          account_id: selectedAccountId !== "none" ? selectedAccountId : undefined,
          idea: ideaPrompt,
          objective,
          apiKey: customApiKey.trim() || undefined,
          modelProfile: selectedModelProfile,
        });
        setResultData(res.data);
        setTraceData(res.trace);
        toast.success("Workflow LangGraph executado com sucesso na OpenAI!");
      } else if (playMode === "agent") {
        const res = await QualifyAI.runAgent({
          agentSlug: selectedAgentSlug,
          prompt: ideaPrompt,
          apiKey: customApiKey.trim() || undefined,
          context: {
            company_id: selectedCompanyId || "default-company",
            account_id: selectedAccountId !== "none" ? selectedAccountId : undefined,
          },
        });
        setResultData(res.data);
        setTraceData(res.trace);
        toast.success(`Agente ${selectedAgentSlug} executado com sucesso na OpenAI!`);
      } else if (playMode === "tool") {
        let parsedInput: any;
        try {
          parsedInput = JSON.parse(toolInputJson);
        } catch {
          throw new Error("JSON de entrada da Tool é inválido.");
        }

        const res = await QualifyAI.runTool(
          selectedToolName,
          parsedInput,
          {
            company_id: selectedCompanyId || "default-company",
            account_id: selectedAccountId !== "none" ? selectedAccountId : undefined,
          },
          selectedAgentSlug
        );
        setResultData(res);
        setTraceData({
          run_id: `tool_run_${Date.now()}`,
          latency_ms: Date.now() - startTime,
          model: "local_tool",
          tokens_total: 0,
          estimated_cost: 0,
          status: "success",
        });
        toast.success("Tool executada com sucesso!");
      } else if (playMode === "skill") {
        // Skill execution
        const res = await QualifyAI.createStrategicReel({
          company_id: selectedCompanyId || "default-company",
          idea: ideaPrompt,
          objective,
          apiKey: customApiKey || undefined,
          modelProfile: selectedModelProfile,
        });
        setResultData(res.data);
        setTraceData(res.trace);
        toast.success("Skill executada com sucesso!");
      }
    } catch (err: any) {
      console.error(err);
      setErrorDetails(err.message || "Erro durante o processamento.");
      toast.error(err.message || "Falha na execução.");
    } finally {
      setExecuting(false);
    }
  };

  // PRÉ-GESTÃO: Gerar Conteúdo Semente da Empresa
  const handleGenerateSeedContent = async () => {
    // REGRA DE NEGÓCIO: Manual da Marca obrigatório
    if (!brandManualCheck?.isFilled) {
      toast.error("Regra de Negócio: O Manual da Marca desta empresa precisa estar preenchido para gerar o Conteúdo Semente.");
      return;
    }

    if (!isKeyConfigured) {
      toast.error("Chave da OpenAI não configurada. Por favor, insira sua chave (sk-proj-...) no campo 'Conexão OpenAI' abaixo para que a IA gere os ganchos e o roteiro em tempo real.");
      return;
    }

    let targetAccountId: string | null = (selectedAccountId && selectedAccountId !== "none") ? selectedAccountId : null;
    if (!targetAccountId && companyAccounts.length > 0) {
      targetAccountId = companyAccounts[0].id;
    }

    try {
      setExecutingSeed(true);
      setErrorDetails(null);
      setResultData(null);
      setTraceData(null);

      const startTime = Date.now();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      // 1. Executar inicialização do Conteúdo Semente (Cria ativação, 5 itens e demandas)
      const seedResult = await CriafySeedContentService.startSeedContent(
        selectedCompanyId,
        targetAccountId,
        userId
      );

      // 2. Gerar roteiro estratégico de IA para o Reel Semente com a OpenAI real
      let generatedReel: any = null;
      let reelRes: any = null;
      try {
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
      } catch (reelErr: any) {
        console.error("[Playground] Erro ao roteirizar Reel com OpenAI:", reelErr);
        throw reelErr;
      }

      setResultData({
        type: "SEED_CONTENT_PACKAGE",
        activation: seedResult.activation,
        items: seedResult.items,
        demands: seedResult.demands,
        generatedReel,
        brandInfo: {
          brandName: brandManualCheck.brandName,
          toneOfVoice: brandManualCheck.toneOfVoice,
        },
      });

      setTraceData({
        run_id: reelRes?.trace?.run_id || `seed_content_${Date.now()}`,
        latency_ms: Date.now() - startTime,
        model: selectedModelProfile,
        tokens_total: reelRes?.trace?.tokens_total || 0,
        estimated_cost: reelRes?.trace?.estimated_cost || 0,
        status: "success",
      });

      toast.success("Conteúdo Semente e Roteiro gerados com sucesso na OpenAI!");
    } catch (err: any) {
      console.error(err);
      setErrorDetails(err.message || "Erro ao gerar Conteúdo Semente.");
      toast.error(err.message || "Falha ao gerar Conteúdo Semente.");
    } finally {
      setExecutingSeed(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Playground Central de IA</h1>
            <Badge variant="outline" className="font-mono text-xs">
              OpenAI + LangChain + LangGraph
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ambiente interativo de teste para Agentes, Skills, Ferramentas e Grafos de Estado.
          </p>
        </div>

        {/* Seletor de Modo (Regra #23: Agent, Skill, Tool, Workflow) */}
        <div className="flex bg-muted p-1 rounded-xl">
          <Button
            size="sm"
            variant={playMode === "workflow" ? "default" : "ghost"}
            className="text-xs gap-1.5 h-8"
            onClick={() => setPlayMode("workflow")}
          >
            <Workflow className="h-3.5 w-3.5" /> Workflow (LangGraph)
          </Button>
          <Button
            size="sm"
            variant={playMode === "agent" ? "default" : "ghost"}
            className="text-xs gap-1.5 h-8"
            onClick={() => setPlayMode("agent")}
          >
            <Bot className="h-3.5 w-3.5" /> Agent
          </Button>
          <Button
            size="sm"
            variant={playMode === "skill" ? "default" : "ghost"}
            className="text-xs gap-1.5 h-8"
            onClick={() => setPlayMode("skill")}
          >
            <Layers className="h-3.5 w-3.5" /> Skill
          </Button>
          <Button
            size="sm"
            variant={playMode === "tool" ? "default" : "ghost"}
            className="text-xs gap-1.5 h-8"
            onClick={() => setPlayMode("tool")}
          >
            <Wrench className="h-3.5 w-3.5" /> Tool
          </Button>
        </div>
      </div>

      {/* Grid: Configuração à esquerda, Resultados à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel de Entrada */}
        <Card className="lg:col-span-5 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Parâmetros de Teste</span>
              <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                Modo: {playMode}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Contexto do tenant, alvos e instruções.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            {/* Contexto: Empresa & Conta */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Empresa (Tenant)</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="h-8 text-xs">
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

              <div>
                <Label className="text-xs mb-1 block">Perfil de Modelo</Label>
                <Select
                  value={selectedModelProfile}
                  onValueChange={(v) => setSelectedModelProfile(v as ModelProfileCode)}
                >
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DEFAULT_MODEL_PROFILES).map((p) => (
                      <SelectItem key={p.code} value={p.code} className="text-xs font-mono">
                        {p.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Seletor de Conta Instagram Vinculada */}
            {companyAccounts.length > 0 && (
              <div>
                <Label className="text-xs mb-1 block flex items-center justify-between">
                  <span>Conta do Instagram (Alvo)</span>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {companyAccounts.length} conta(s) encontrada(s)
                  </Badge>
                </Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companyAccounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        @{acc.username || acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* REGRA DE NEGÓCIO: Verificação do Manual da Marca */}
            {brandManualCheck && (
              <div className="transition-all">
                {brandManualCheck.isFilled ? (
                  <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Manual da Marca Preenchido
                      </span>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                        {brandManualCheck.brandName}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {brandManualCheck.details} {brandManualCheck.toneOfVoice ? `• Tom: ${brandManualCheck.toneOfVoice}` : ""}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-destructive" /> Manual da Marca Não Preenchido
                      </span>
                      <Badge variant="destructive" className="text-[10px]">
                        Bloqueado
                      </Badge>
                    </div>
                    <p className="text-[11px] text-destructive/90 leading-relaxed font-medium">
                      Regra de Negócio: O Manual da Marca precisa estar preenchido para realizar qualquer execução na Central de IA ou gerar o Conteúdo Semente.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/criafy?tab=manual-marca")}
                      className="w-full h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Preencher Manual da Marca na Criafy</span>
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* AÇÃO DE PRÉ-GESTÃO: GERAR CONTEÚDO SEMENTE */}
            <div className="p-3.5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Pré-Gestão: Conteúdo Semente</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold text-primary">
                  Marco Zero (5 Peças)
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Gera o primeiro pacote estratégico da empresa: 1 Reel sobre método, 1 Destaque e 3 Posts estáticos integrados ao Planner e Demandas da Criafy.
              </p>
              <Button
                type="button"
                size="sm"
                disabled={!brandManualCheck?.isFilled || executingSeed}
                onClick={handleGenerateSeedContent}
                className="w-full h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
              >
                {executingSeed ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gerando Conteúdo Semente com IA...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Gerar Conteúdo Semente da Empresa</span>
                  </>
                )}
              </Button>
              {!brandManualCheck?.isFilled && (
                <p className="text-[10px] text-destructive font-medium text-center">
                  * Bloqueado: Requer Manual da Marca preenchido
                </p>
              )}
            </div>

            {/* Status da Conexão OpenAI Real */}
            <div className="p-3 rounded-xl border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" /> Conexão OpenAI
                </span>
                {isKeyConfigured ? (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30 gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {openAiConfig?.maskedKey
                      ? `Chave Ativa (${openAiConfig.maskedKey})`
                      : customApiKey
                      ? `Chave Informada (${customApiKey.slice(0, 7)}...${customApiKey.slice(-4)})`
                      : "Chave Ativa"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/30 gap-1 font-mono">
                    <AlertCircle className="w-3 h-3 text-amber-600" /> Sem chave global salva
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Chave OpenAI (sk-proj-...):</span>
                  {customApiKey && customApiKey.trim().length > 10 && (
                    <button
                      type="button"
                      onClick={handleSaveGlobalKey}
                      disabled={savingKey}
                      className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                    >
                      {savingKey ? "Salvando..." : "Salvar no sistema"}
                    </button>
                  )}
                </Label>
                <Input
                  type="password"
                  placeholder={
                    isKeyConfigured
                      ? (openAiConfig?.maskedKey ? `Usando chave salva (${openAiConfig.maskedKey}) — digite para substituir` : "Usando chave salva no sistema")
                      : "Insira sua chave sk-proj-... para chamadas reais"
                  }
                  value={customApiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  * As requisições executadas com sua chave serão debitadas e visíveis em tempo real no seu painel da OpenAI (platform.openai.com/usage).
                </p>
              </div>
            </div>

            {/* Seletores Específicos por Modo */}
            {playMode === "workflow" && (
              <div>
                <Label className="text-xs mb-1 block">Workflow LangGraph</Label>
                <Select value={selectedWorkflowSlug} onValueChange={setSelectedWorkflowSlug}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(WorkflowRegistry).length === 0 ? <SelectItem value="none" disabled>Nenhum workflow registrado</SelectItem> : Object.values(WorkflowRegistry).map((wf) => (
                      <SelectItem key={wf.slug} value={wf.slug}>
                        {wf.name} ({wf.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {playMode === "agent" && (
              <div>
                <Label className="text-xs mb-1 block">Agente Selecionado</Label>
                <Select value={selectedAgentSlug} onValueChange={setSelectedAgentSlug}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREPARED_AGENTS.length === 0 ? <SelectItem value="none" disabled>Nenhum agente cadastrado</SelectItem> : PREPARED_AGENTS.map((a) => (
                      <SelectItem key={a.slug} value={a.slug}>
                        {a.name} ({a.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {playMode === "skill" && (
              <div>
                <Label className="text-xs mb-1 block">Skill Selecionada</Label>
                <Select value={selectedSkillSlug} onValueChange={setSelectedSkillSlug}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREPARED_SKILLS.length === 0 ? <SelectItem value="none" disabled>Nenhuma skill cadastrada</SelectItem> : PREPARED_SKILLS.map((s) => (
                      <SelectItem key={s.slug} value={s.slug}>
                        {s.name} ({s.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {playMode === "tool" && (
              <div>
                <Label className="text-xs mb-1 block">Ferramenta (Tool)</Label>
                <Select value={selectedToolName} onValueChange={setSelectedToolName}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_TOOLS.length === 0 ? <SelectItem value="none" disabled>Nenhuma tool cadastrada</SelectItem> : ALL_TOOLS.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name} [{t.type}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Inputs de Conteúdo */}
            {playMode !== "tool" ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1 block">Tema / Ideia Central</Label>
                  <Textarea
                    value={ideaPrompt}
                    onChange={(e) => setIdeaPrompt(e.target.value)}
                    rows={3}
                    placeholder="Descreva a tese, ideia ou dor a ser abordada..."
                    className="text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Objetivo</Label>
                  <Input
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Ex: Autoridade, retenção e atração qualificada"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-xs mb-1 block">JSON de Entrada (Input Schema)</Label>
                <Textarea
                  value={toolInputJson}
                  onChange={(e) => setToolInputJson(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5 pt-2">
              <Button
                className="w-full gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                onClick={handleExecute}
                disabled={executing || !brandManualCheck?.isFilled}
              >
                {executing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processando LangGraph/LangChain...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" /> Executar no Runtime
                  </>
                )}
              </Button>
              {!brandManualCheck?.isFilled && (
                <p className="text-[11px] text-destructive text-center font-medium">
                  ⚠️ Execução bloqueada: preencha o Manual da Marca primeiro.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Painel de Resultados & Observabilidade */}
        <Card className="lg:col-span-7 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Métricas & Saída em Tempo Real</CardTitle>
                <CardDescription className="text-xs">
                  Inspeção de estado do StateGraph, rastros de tools, tokens e custos.
                </CardDescription>
              </div>

              {traceData && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    <Clock className="h-3 w-3 mr-1 text-blue-500" />
                    {traceData.latency_ms}ms
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    <Zap className="h-3 w-3 mr-1 text-amber-500" />
                    {traceData.tokens_total || 0} tokens
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    <DollarSign className="h-3 w-3 mr-1 text-emerald-500" />
                    ${(traceData.estimated_cost || 0).toFixed(4)}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col">
            {errorDetails && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-xs mb-4 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Erro de Execução</div>
                  <div className="mt-1 leading-relaxed whitespace-pre-wrap">{errorDetails}</div>
                </div>
              </div>
            )}

            {!resultData && !executing && !executingSeed && !errorDetails && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-muted-foreground">
                <PlayCircle className="h-12 w-12 stroke-[1.5] mb-3 opacity-40" />
                <p className="text-sm font-medium">Nenhuma execução realizada</p>
                <p className="text-xs mt-1 max-w-sm">
                  Configure os parâmetros à esquerda e clique em Executar para disparar o runtime nativo do LangChain / LangGraph, ou utilize o botão de pré-gestão para gerar o Conteúdo Semente.
                </p>
              </div>
            )}

            {executing && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">Executando Grafo de Estados...</p>
                <p className="text-xs text-muted-foreground">
                  Validando RBAC, resolvendo contexto do tenant e executando nós.
                </p>
              </div>
            )}

            {executingSeed && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Gerando Conteúdo Semente da Empresa...</p>
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  Criando o marco zero (1 Reel, 1 Destaque, 3 Posts), registrando no Planner, gerando demandas e roteirizando com os Agentes.
                </p>
              </div>
            )}

            {resultData && !executing && !executingSeed && (
              <div className="flex-1 flex flex-col">
                {/* Visualização de Pacote Semente Gerado */}
                {resultData.type === "SEED_CONTENT_PACKAGE" && (
                  <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 mb-4 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-lg">
                          🌱
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            <span>Pacote Conteúdo Semente Criado</span>
                            <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                              5/5 Peças Mapeadas
                            </Badge>
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            {resultData.demands?.length || 0} demandas operacionais vinculadas diretamente no Planner da Criafy
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate("/criafy?tab=planner")}
                        className="h-8 px-3 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0"
                      >
                        <span>Abrir no Planner</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {resultData.items?.map((it: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl border bg-card/90 flex items-center justify-between gap-2 shadow-2xs">
                          <div className="min-w-0">
                            <div className="font-bold truncate text-[11px] text-foreground">{it.theme}</div>
                            <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 mt-0.5">
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                {it.format}
                              </Badge>
                              <span>• Prioridade {it.priority}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] uppercase shrink-0 text-emerald-600 border-emerald-500/30">
                            {it.status}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {resultData.generatedReel && (
                      <div className="p-3.5 rounded-xl border bg-card space-y-2 mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1.5 text-foreground">
                            <Film className="w-3.5 h-3.5 text-primary" /> Roteiro Estratégico do Reel (IA OpenAI)
                          </span>
                          <Badge variant="secondary" className="text-[10px] text-primary">
                            Pontuação Hook: {resultData.generatedReel.hook_score || 85}/100
                          </Badge>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/60 text-[11px]">
                          <span className="font-semibold text-primary">Gancho Vencedor: </span>
                          <span className="font-medium text-foreground">&quot;{resultData.generatedReel.selected_hook}&quot;</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto font-mono">
                          {resultData.generatedReel.script}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Tabs defaultValue="output" className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-4 h-8 mb-3">
                  <TabsTrigger value="output" className="text-xs">Output</TabsTrigger>
                  <TabsTrigger value="state" className="text-xs">State</TabsTrigger>
                  <TabsTrigger value="trace" className="text-xs">Trace</TabsTrigger>
                  <TabsTrigger value="tools" className="text-xs">Tool Calls</TabsTrigger>
                </TabsList>

                {/* Tab 1: Output Estruturado */}
                <TabsContent value="output" className="flex-1 overflow-y-auto max-h-[500px]">
                  <div className="p-3 bg-muted rounded-lg font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(resultData, null, 2)}
                  </div>
                </TabsContent>

                {/* Tab 2: State do Grafo */}
                <TabsContent value="state" className="flex-1 overflow-y-auto max-h-[500px]">
                  <div className="space-y-3 text-xs">
                    {resultData.selected_hook && (
                      <div className="p-3 bg-muted/60 rounded-lg border">
                        <span className="font-semibold text-emerald-600">Hook Vencedor Selecionado:</span>
                        <p className="mt-1 font-medium text-foreground">{resultData.selected_hook}</p>
                      </div>
                    )}
                    {resultData.beat_sheet && (
                      <div className="p-3 bg-muted/60 rounded-lg border">
                        <span className="font-semibold text-blue-600">Beat Sheet & Duração:</span>
                        <p className="mt-1">
                          {resultData.beat_sheet.formatted_duration} ({resultData.beat_sheet.total_words} palavras)
                        </p>
                        <p className="text-muted-foreground text-[11px] mt-1">
                          {resultData.beat_sheet.beats?.length || 0} blocos cronometrados
                        </p>
                      </div>
                    )}
                    <pre className="p-3 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
                      {JSON.stringify(resultData, null, 2)}
                    </pre>
                  </div>
                </TabsContent>

                {/* Tab 3: Trace de Execução */}
                <TabsContent value="trace" className="flex-1 overflow-y-auto max-h-[500px]">
                  <div className="p-3 bg-muted rounded-lg font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(traceData || {}, null, 2)}
                  </div>
                </TabsContent>

                {/* Tab 4: Tool Calls */}
                <TabsContent value="tools" className="flex-1 overflow-y-auto max-h-[500px]">
                  {traceData?.tool_calls && traceData.tool_calls.length > 0 ? (
                    <div className="space-y-2">
                      {traceData.tool_calls.map((tc: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg border text-xs">
                          <div className="flex items-center justify-between font-mono font-medium">
                            <span className="text-primary">{tc.tool}</span>
                            <span className="text-muted-foreground text-[11px]">{tc.latency_ms}ms</span>
                          </div>
                          <pre className="mt-2 p-2 bg-background rounded text-[11px] font-mono overflow-x-auto">
                            {JSON.stringify(tc.output, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-xs">
                      Nenhuma tool call direta registrada no trace isolado.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
