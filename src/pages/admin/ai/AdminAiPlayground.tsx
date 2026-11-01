import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [resultData, setResultData] = useState<any>(null);
  const [traceData, setTraceData] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>("");

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const handleExecute = async () => {
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
          apiKey: customApiKey || undefined,
          modelProfile: selectedModelProfile,
        });
        setResultData(res.data);
        setTraceData(res.trace);
        toast.success("Workflow LangGraph executado com sucesso!");
      } else if (playMode === "agent") {
        const res = await QualifyAI.runAgent({
          agentSlug: selectedAgentSlug,
          prompt: ideaPrompt,
          apiKey: customApiKey || undefined,
          context: {
            company_id: selectedCompanyId || "default-company",
            account_id: selectedAccountId !== "none" ? selectedAccountId : undefined,
          },
        });
        setResultData(res.data);
        setTraceData(res.trace);
        toast.success("Agente LangChain executado com sucesso!");
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

            {/* Status da Conexão OpenAI Real */}
            <div className="p-3 rounded-xl border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" /> Conexão OpenAI
                </span>
                {openAiConfig?.status === "active" ? (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30 gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Chave Ativa ({openAiConfig.maskedKey})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/30 gap-1 font-mono">
                    <AlertCircle className="w-3 h-3 text-amber-600" /> Sem chave global salva
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Chave OpenAI personalizada para teste (opcional):
                </Label>
                <Input
                  type="password"
                  placeholder={
                    openAiConfig?.status === "active"
                      ? "Deixe vazio para usar a chave configurada na plataforma"
                      : "sk-proj-..."
                  }
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
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
                    {Object.values(WorkflowRegistry).map((wf) => (
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
                    {PREPARED_AGENTS.map((a) => (
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
                    {PREPARED_SKILLS.map((s) => (
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
                    {ALL_TOOLS.map((t) => (
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

            <Button
              className="w-full gap-2 mt-4 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleExecute}
              disabled={executing}
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

            {!resultData && !executing && !errorDetails && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-muted-foreground">
                <PlayCircle className="h-12 w-12 stroke-[1.5] mb-3 opacity-40" />
                <p className="text-sm font-medium">Nenhuma execução realizada</p>
                <p className="text-xs mt-1 max-w-sm">
                  Configure os parâmetros à esquerda e clique em Executar para disparar o runtime nativo do LangChain / LangGraph.
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

            {resultData && !executing && (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
