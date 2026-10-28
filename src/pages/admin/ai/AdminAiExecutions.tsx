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
import { toast } from "sonner";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import { AiExecution } from "@/types/aiSkills";

export default function AdminAiExecutions() {
  const [skillFilter, setSkillFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [selectedExecution, setSelectedExecution] = useState<AiExecution | null>(null);

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

  const executions = data?.executions || [];
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
          Rastreabilidade completa de todas as gerações: tokens consumidos, custos estimados, latência e integridade do contrato de saída.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Select value={skillFilter} onValueChange={(v) => { setSkillFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-xs w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrar por Skill..." />
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

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-xs w-full sm:w-[150px]">
            <SelectValue placeholder="Status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos Status</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
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
              Realize testes no Playground ou aguarde as gerações dos usuários no Criafy.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-medium">
                  <th className="py-3 px-4">Skill & Ação</th>
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
                {executions.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        {e.skill_slug}
                        <Badge variant="outline" className="text-[9px] py-0">v{e.skill_version}</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {e.input_summary?.theme || e.action}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">{e.model}</td>
                    <td className="py-3 px-3">
                      {e.status === "success" ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          Sucesso
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Erro
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {e.tokens_input + e.tokens_output}
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({e.tokens_input}/{e.tokens_output})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">{e.latency_ms} ms</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                      ${Number(e.estimated_cost).toFixed(5)}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground text-[11px]">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setSelectedExecution(e)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver
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
          <div className="p-3 border-t flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Página {page} de {totalPages} ({total} execuções no total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Execução */}
      <Dialog open={!!selectedExecution} onOpenChange={(open) => !open && setSelectedExecution(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedExecution && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Inspeção da Execução — {selectedExecution.skill_slug} (v{selectedExecution.skill_version})
                </DialogTitle>
                <DialogDescription className="text-xs">
                  ID: <code className="font-mono text-foreground">{selectedExecution.id}</code> • {new Date(selectedExecution.created_at).toLocaleString("pt-BR")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Resumo de Métricas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-muted-foreground text-[10px]">Modelo Utilizado</span>
                    <div className="font-mono font-bold mt-0.5">{selectedExecution.model}</div>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-muted-foreground text-[10px]">Tokens Totais</span>
                    <div className="font-mono font-bold mt-0.5">{selectedExecution.tokens_input + selectedExecution.tokens_output}</div>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-muted-foreground text-[10px]">Latência</span>
                    <div className="font-mono font-bold mt-0.5">{selectedExecution.latency_ms} ms</div>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-muted-foreground text-[10px]">Custo Estimado</span>
                    <div className="font-mono font-bold mt-0.5">${Number(selectedExecution.estimated_cost).toFixed(5)}</div>
                  </div>
                </div>

                {/* Input Summary */}
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">Sumário da Entrada</div>
                  <pre className="p-3 bg-muted/40 border rounded-lg font-mono text-[11px]">
                    {JSON.stringify(selectedExecution.input_summary || {}, null, 2)}
                  </pre>
                </div>

                {/* Output */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Saída da Geração</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => handleCopy(JSON.stringify(selectedExecution.output || {}, null, 2))}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copiar JSON
                    </Button>
                  </div>
                  <pre className="p-3 bg-muted/40 border rounded-lg font-mono text-[11px] leading-relaxed max-h-[250px] overflow-y-auto">
                    {JSON.stringify(selectedExecution.output || {}, null, 2)}
                  </pre>
                </div>

                {/* Erro se houver */}
                {selectedExecution.error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg space-y-1">
                    <span className="font-bold">Erro Registrado:</span>
                    <p className="font-mono text-[11px]">{selectedExecution.error}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
