import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  DollarSign,
  Copy,
  ChevronLeft,
  ChevronRight,
  Bot,
  Workflow,
  Wrench,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import { PREPARED_AGENTS, ALL_TOOLS, WorkflowRegistry } from "@/ai";

export default function AdminAiExecutions() {
  const [skillFilter, setSkillFilter] = useState<string>("ALL");
  const [agentFilter, setAgentFilter] = useState<string>("ALL");
  const [workflowFilter, setWorkflowFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null);

  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin_ai_executions_page", skillFilter, statusFilter, page],
    queryFn: () =>
      AIExecutionService.getExecutions({
        skillSlug: skillFilter !== "ALL" ? skillFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        page,
        limit,
      }),
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["admin_ai_skills_filter_list"],
    queryFn: () => AIExecutionService.getSkills(),
  });

  const executions = (data?.executions || []).filter((e: any) => {
    if (agentFilter !== "ALL" && e.agent_slug !== agentFilter) return false;
    if (workflowFilter !== "ALL" && e.workflow_slug !== workflowFilter && e.action !== workflowFilter) return false;
    return true;
  });

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Logs e Execuções de IA</h1>
          <Badge variant="secondary" className="font-mono text-xs">{total} registros</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Rastreabilidade completa de todas as execuções: LangGraph StateGraph, Agentes LangChain, tool calls, tokens e custos.
        </p>
      </div>

      {/* Barra de Filtros (Regra #22 do Master Prompt) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <Select value={skillFilter} onValueChange={(v) => { setSkillFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Skill..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as Skills</SelectItem>
            {skills.map((s) => (
              <SelectItem key={s.id} value={s.slug}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={agentFilter} onValueChange={(v) => { setAgentFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Agente..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Agentes</SelectItem>
            {PREPARED_AGENTS.map((a) => (
              <SelectItem key={a.slug} value={a.slug}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={workflowFilter} onValueChange={(v) => { setWorkflowFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Workflow..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Workflows</SelectItem>
            {Object.values(WorkflowRegistry).map((w) => (
              <SelectItem key={w.slug} value={w.slug}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Status</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="retrying">Retentativa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Execuções */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">Carregando execuções...</div>
        ) : executions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <div className="text-sm font-medium text-foreground">Nenhuma execução encontrada</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Realize testes no Playground ou execute um workflow LangGraph para gerar registros de auditoria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-medium">
                  <th className="py-3 px-4">Ação / Workflow / Agente</th>
                  <th className="py-3 px-3">Modelo</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Tokens</th>
                  <th className="py-3 px-3">Latência</th>
                  <th className="py-3 px-3">Custo Est.</th>
                  <th className="py-3 px-3">Data / Hora</th>
                  <th className="py-3 px-4 text-right">Inspecionar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {executions.map((e: any) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground flex items-center gap-1.5">
                        {e.workflow_slug || e.action === "create_strategic_reel" ? (
                          <Workflow className="h-3.5 w-3.5 text-emerald-600" />
                        ) : e.agent_slug ? (
                          <Bot className="h-3.5 w-3.5 text-blue-600" />
                        ) : (
                          <Layers className="h-3.5 w-3.5 text-purple-600" />
                        )}
                        <span>{e.workflow_slug || e.agent_slug || e.skill_slug || e.action}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {e.id.slice(0, 16)}...
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">{e.model || "gpt-4o-mini"}</td>
                    <td className="py-3 px-3">
                      {e.status === "success" ? (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Sucesso
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertCircle className="h-3 w-3 mr-1" /> Erro
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">
                      {(e.tokens_input || 0) + (e.tokens_output || 0)}
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{e.latency_ms || 0}ms</td>
                    <td className="py-3 px-3 font-mono text-emerald-600">
                      ${Number(e.estimated_cost || 0).toFixed(4)}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground text-[11px]">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setSelectedExecution(e)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>Página {page} de {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhe e Auditoria da Execução (Regra #22 do Master Prompt) */}
      <Dialog open={Boolean(selectedExecution)} onOpenChange={() => setSelectedExecution(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedExecution && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-mono">
                    {selectedExecution.workflow_slug || selectedExecution.skill_slug || selectedExecution.action}
                  </DialogTitle>
                  <Badge variant={selectedExecution.status === "success" ? "default" : "destructive"}>
                    {selectedExecution.status}
                  </Badge>
                </div>
                <DialogDescription className="text-xs font-mono">
                  ID: {selectedExecution.id} | Iniciado em {new Date(selectedExecution.created_at).toLocaleString("pt-BR")}
                </DialogDescription>
              </DialogHeader>

              {/* Métricas Rápidas */}
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-muted rounded-lg border">
                  <div className="text-muted-foreground text-[10px]">Modelo</div>
                  <div className="font-mono font-medium mt-0.5">{selectedExecution.model}</div>
                </div>
                <div className="p-2.5 bg-muted rounded-lg border">
                  <div className="text-muted-foreground text-[10px]">Tokens Totais</div>
                  <div className="font-mono font-medium mt-0.5">
                    {(selectedExecution.tokens_input || 0) + (selectedExecution.tokens_output || 0)}
                  </div>
                </div>
                <div className="p-2.5 bg-muted rounded-lg border">
                  <div className="text-muted-foreground text-[10px]">Latência</div>
                  <div className="font-mono font-medium mt-0.5">{selectedExecution.latency_ms}ms</div>
                </div>
                <div className="p-2.5 bg-muted rounded-lg border">
                  <div className="text-muted-foreground text-[10px]">Custo Estimado</div>
                  <div className="font-mono font-medium mt-0.5 text-emerald-600">
                    ${Number(selectedExecution.estimated_cost || 0).toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Abas de Detalhes: Timeline, Output, Tool Calls, Context */}
              <Tabs defaultValue="output" className="space-y-3">
                <TabsList className="grid grid-cols-4 h-8 text-xs">
                  <TabsTrigger value="output" className="text-xs">Output</TabsTrigger>
                  <TabsTrigger value="tools" className="text-xs">Tool Calls</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                  <TabsTrigger value="context" className="text-xs">Input & Tenant</TabsTrigger>
                </TabsList>

                <TabsContent value="output">
                  <pre className="p-3 bg-muted rounded-lg font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-64">
                    {JSON.stringify(selectedExecution.output || {}, null, 2)}
                  </pre>
                </TabsContent>

                <TabsContent value="tools">
                  {selectedExecution.tool_calls && selectedExecution.tool_calls.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedExecution.tool_calls.map((tc: any, i: number) => (
                        <div key={i} className="p-2.5 bg-muted rounded border text-xs">
                          <div className="flex justify-between font-mono font-semibold text-primary">
                            <span>{tc.tool}</span>
                            <span>{tc.latency_ms}ms</span>
                          </div>
                          <pre className="mt-1 p-2 bg-background rounded text-[11px] overflow-x-auto">
                            {JSON.stringify(tc.output, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      Nenhuma tool call direta registrada nesta execução.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline">
                  <div className="p-4 bg-muted/40 rounded-lg border space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-semibold">Início:</span>
                      <span>{new Date(selectedExecution.created_at).toISOString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="font-semibold">Conclusão:</span>
                      <span>Duração total de {selectedExecution.latency_ms}ms</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="context">
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-2.5 bg-muted rounded">
                      <span className="font-semibold text-muted-foreground">Company ID:</span>{" "}
                      {selectedExecution.company_id || "Global"}
                    </div>
                    <div className="p-2.5 bg-muted rounded">
                      <span className="font-semibold text-muted-foreground">Account ID:</span>{" "}
                      {selectedExecution.account_id || "N/A"}
                    </div>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-48">
                      {JSON.stringify(selectedExecution.input_summary || {}, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
