import { useState, useMemo } from "react";
import { useApi4comLogs, Api4comLogItem } from "@/hooks/useApi4comLogs";
import { MetricCard } from "@/components/dispatch/MetricCard";
import { DataTableWithPagination } from "@/components/dispatch/DataTableWithPagination";
import { EmptyState } from "@/components/dispatch/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw, Download, Search, CheckCircle2, XCircle, Clock, Activity, 
  Loader2, Copy, Check, Eye, PhoneCall, Phone, PhoneOff, PhoneForwarded,
  Volume2, AlertTriangle, ShieldCheck, User, Building2, Play
} from "lucide-react";
import { toast } from "sonner";

export function Api4comLogsTab() {
  const { logs, isLoading, refetch } = useApi4comLogs();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const [selectedLog, setSelectedLog] = useState<Api4comLogItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);

  // List of unique operators
  const operatorsList = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((log) => {
      if (log.operator?.id && log.operator.name) {
        const label = log.operator.extension
          ? `${log.operator.name} (Ramal ${log.operator.extension})`
          : log.operator.name;
        map.set(log.operator.id, label);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [logs]);

  // List of unique companies
  const companiesList = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((log) => {
      if (log.company?.id && log.company.name) {
        map.set(log.company.id, log.company.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Status filter
      if (statusFilter !== "all") {
        const s = log.status.toLowerCase();
        if (statusFilter === "completed" && !(s === "completed" || s === "answered")) return false;
        if (statusFilter === "in_progress" && !(s === "in_progress" || s === "dialing")) return false;
        if (statusFilter === "no_answer" && s !== "no_answer") return false;
        if (statusFilter === "busy" && s !== "busy") return false;
        if (statusFilter === "failed" && !(s === "failed" || s === "rejected" || s === "call_rejected")) return false;
      }

      // Operator filter
      if (operatorFilter !== "all") {
        if (log.operator?.id !== operatorFilter) return false;
      }

      // Company filter
      if (companyFilter !== "all") {
        if (log.company?.id !== companyFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const opName = log.operator?.name?.toLowerCase() || "";
        const opExt = log.operator?.extension?.toLowerCase() || "";
        const leadPhone = log.lead?.phone?.toLowerCase() || "";
        const leadName = log.lead?.name?.toLowerCase() || "";
        const companyName = log.company?.name?.toLowerCase() || "";
        const extId = log.externalCallId?.toLowerCase() || "";
        const hangup = log.hangupCause?.toLowerCase() || "";
        const campaign = log.campaign?.name?.toLowerCase() || "";

        const matches =
          opName.includes(term) ||
          opExt.includes(term) ||
          leadPhone.includes(term) ||
          leadName.includes(term) ||
          companyName.includes(term) ||
          extId.includes(term) ||
          hangup.includes(term) ||
          campaign.includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [logs, statusFilter, operatorFilter, companyFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const answered = logs.filter(
      (l) => l.status === "completed" || l.status === "answered" || (l.durationSeconds && l.durationSeconds > 0)
    ).length;
    const failed = logs.filter(
      (l) => l.status === "failed" || l.status === "busy" || l.status === "no_answer"
    ).length;
    const rate = total > 0 ? Math.round((answered / total) * 100) : 0;
    const lastAttempt = logs.length > 0 ? logs[0].formattedDate : "-";

    return { total, answered, failed, rate, lastAttempt };
  }, [logs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Logs da API4COM atualizados com sucesso!");
    } catch {
      toast.error("Erro ao atualizar logs.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `api4com-logs-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Logs exportados em formato JSON!");
    } catch {
      toast.error("Erro ao exportar logs.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
    toast.success("Copiado para a área de transferência!");
  };

  const columns = [
    {
      key: "createdAt",
      header: "Data / Hora",
      render: (log: Api4comLogItem) => (
        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
          {log.formattedDate}
        </span>
      ),
    },
    {
      key: "operator",
      header: "Operador / Ramal",
      render: (log: Api4comLogItem) => {
        if (!log.operator) {
          return <span className="text-xs text-muted-foreground italic">Sistema Automático</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 ring-1 ring-primary/20">
              <AvatarFallback className="text-[10px] bg-indigo-500/10 text-indigo-600 font-bold">
                {log.operator.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
                {log.operator.name}
              </span>
              {log.operator.extension && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  Ramal {log.operator.extension}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "lead",
      header: "Destino / Lead",
      render: (log: Api4comLogItem) => {
        const phone = log.lead?.phone;
        const name = log.lead?.name;
        return (
          <div className="flex flex-col max-w-[160px]">
            {name && <span className="text-xs font-medium text-foreground truncate">{name}</span>}
            <span className="font-mono text-xs text-muted-foreground truncate">
              {phone || "—"}
            </span>
          </div>
        );
      },
    },
    {
      key: "duration",
      header: "Duração",
      render: (log: Api4comLogItem) => (
        <Badge variant="outline" className="font-mono text-xs w-fit">
          <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
          {log.durationFormatted}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status da Ligação",
      render: (log: Api4comLogItem) => {
        const s = log.status.toLowerCase();
        if (s === "completed" || s === "answered") {
          return (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Atendida
            </Badge>
          );
        }
        if (s === "busy") {
          return (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
              <PhoneOff className="h-3 w-3 mr-1" /> Ocupado
            </Badge>
          );
        }
        if (s === "no_answer") {
          return (
            <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
              <PhoneForwarded className="h-3 w-3 mr-1" /> Não Atendida
            </Badge>
          );
        }
        if (s === "dialing" || s === "in_progress") {
          return (
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Em Andamento
            </Badge>
          );
        }
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs">
            <XCircle className="h-3 w-3 mr-1" /> {log.hangupCause || "Falha"}
          </Badge>
        );
      },
    },
    {
      key: "externalId",
      header: "ID Chamada API4COM",
      render: (log: Api4comLogItem) => {
        if (!log.externalCallId) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1">
            <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[120px]" title={log.externalCallId}>
              {log.externalCallId}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(log.externalCallId!);
              }}
              title="Copiar ID da chamada"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      key: "audio",
      header: "Gravação",
      render: (log: Api4comLogItem) => {
        if (!log.audioUrl) {
          return <span className="text-[11px] text-muted-foreground italic">Sem gravação</span>;
        }
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            onClick={(e) => {
              e.stopPropagation();
              setPlayingAudioUrl(log.audioUrl);
            }}
          >
            <Volume2 className="h-3.5 w-3.5" />
            Ouvir
          </Button>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (log: Api4comLogItem) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
            setShowDialog(true);
          }}
          title="Ver detalhes e webhook da API4COM"
        >
          <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Apresentação e Ações */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600">
              <PhoneCall className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-foreground">
              Logs de Chamadas & Telefonia API4COM
            </h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Monitore requisições de discagem, webhooks de status em tempo real (channel-answer / channel-hangup), tempos de chamada e gravações de áudio SIP.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs h-9"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Total de Chamadas" value={stats.total} icon={Activity} />
        <MetricCard title="Atendidas com Sucesso" value={stats.answered} icon={CheckCircle2} />
        <MetricCard title="Falhas / Ocupado" value={stats.failed} icon={XCircle} />
        <MetricCard title="Taxa de Atendimento" value={`${stats.rate}%`} icon={ShieldCheck} />
        <MetricCard title="Última Chamada" value={stats.lastAttempt ? stats.lastAttempt.slice(0, 10) : "-"} icon={Clock} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por operador, ramal, telefone, ID da chamada ou causa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[170px] text-xs h-9">
            <SelectValue placeholder="Todos os Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="completed">Atendidas / Sucesso</SelectItem>
            <SelectItem value="in_progress">Em Andamento / Discando</SelectItem>
            <SelectItem value="no_answer">Não Atendidas</SelectItem>
            <SelectItem value="busy">Ocupadas</SelectItem>
            <SelectItem value="failed">Falhas / Rejeitadas</SelectItem>
          </SelectContent>
        </Select>

        {operatorsList.length > 0 && (
          <Select value={operatorFilter} onValueChange={setOperatorFilter}>
            <SelectTrigger className="w-full sm:w-[190px] text-xs h-9">
              <SelectValue placeholder="Todos os Operadores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Operadores</SelectItem>
              {operatorsList.map((op) => (
                <SelectItem key={op.id} value={op.id}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {companiesList.length > 0 && (
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-full sm:w-[170px] text-xs h-9">
              <SelectValue placeholder="Todas as Empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Empresas</SelectItem>
              {companiesList.map((comp) => (
                <SelectItem key={comp.id} value={comp.id}>
                  {comp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabela de Logs */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          title="Nenhum log de telefonia encontrado"
          description="Nenhuma chamada registrada corresponde aos filtros selecionados"
          icon={PhoneOff}
        />
      ) : (
        <DataTableWithPagination
          columns={columns}
          data={filteredLogs}
          keyExtractor={(log) => log.id}
          onRowClick={(log) => {
            setSelectedLog(log);
            setShowDialog(true);
          }}
        />
      )}

      {/* Modal de Detalhes da Chamada / Payload da API4COM */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-indigo-600" />
                <span>Detalhes Técnicos da Chamada API4COM</span>
              </DialogTitle>
              {selectedLog && (
                <Badge
                  className={
                    selectedLog.status === "completed" || selectedLog.status === "answered"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  }
                >
                  {selectedLog.status.toUpperCase()}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Metadados completos de roteamento, eventos de webhook e retorno bruto da API4COM.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2">
              {/* Informações da Chamada */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground block">Operador:</span>
                  <span className="font-semibold text-foreground">
                    {selectedLog.operator?.name || "Automático"}
                  </span>
                  {selectedLog.operator?.extension && (
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      Ramal: {selectedLog.operator.extension}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block">Destino (Lead):</span>
                  <span className="font-mono font-semibold text-foreground">
                    {selectedLog.lead?.phone || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Duração Total:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedLog.durationFormatted} ({selectedLog.durationSeconds}s)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Motivo Desligamento:</span>
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {selectedLog.hangupCause || "NORMAL"}
                  </span>
                </div>
              </div>

              {/* Player de Áudio se houver gravação */}
              {selectedLog.audioUrl && (
                <div className="p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                    <Volume2 className="h-4 w-4 text-indigo-600" />
                    <span>Gravação da Ligação na API4COM</span>
                  </div>
                  <audio controls className="w-full h-8" src={selectedLog.audioUrl}>
                    Seu navegador não suporta reprodução de áudio.
                  </audio>
                </div>
              )}

              {/* ID Externo da Chamada */}
              {selectedLog.externalCallId && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border text-xs">
                  <div>
                    <span className="text-muted-foreground block">External Call ID (API4COM):</span>
                    <span className="font-mono font-medium">{selectedLog.externalCallId}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => copyToClipboard(selectedLog.externalCallId!)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar ID
                  </Button>
                </div>
              )}

              {/* Payload / Metadados da API4COM */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Metadados &amp; Webhook da API4COM (JSON)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(
                          selectedLog.api4comMetadata || {
                            call_id: selectedLog.externalCallId,
                            status: selectedLog.status,
                            duration: selectedLog.durationSeconds,
                            hangup_cause: selectedLog.hangupCause,
                            operator: selectedLog.operator,
                            lead: selectedLog.lead,
                          },
                          null,
                          2
                        )
                      )
                    }
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar JSON
                      </>
                    )}
                  </Button>
                </div>

                <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-[300px] border border-slate-800 leading-relaxed shadow-inner">
                  {JSON.stringify(
                    selectedLog.api4comMetadata || {
                      call_id: selectedLog.externalCallId,
                      status: selectedLog.status,
                      duration_seconds: selectedLog.durationSeconds,
                      hangup_cause: selectedLog.hangupCause,
                      hangup_cause_code: selectedLog.hangupCauseCode,
                      audio_url: selectedLog.audioUrl,
                      operator: selectedLog.operator,
                      lead: selectedLog.lead,
                      company: selectedLog.company,
                      campaign: selectedLog.campaign,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Mini Player de Áudio Rápido */}
      <Dialog open={!!playingAudioUrl} onOpenChange={(open) => !open && setPlayingAudioUrl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Volume2 className="h-4 w-4 text-indigo-600" />
              <span>Gravação da Chamada</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {playingAudioUrl && (
              <audio controls autoPlay className="w-full">
                <source src={playingAudioUrl} />
                Seu navegador não suporta reprodução de áudio.
              </audio>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
