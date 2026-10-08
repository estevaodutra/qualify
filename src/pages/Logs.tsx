import { useState, useMemo } from "react";
import { useLanguage } from "@/i18n";
import { useSequenceLogs, SequenceLog } from "@/hooks/useSequenceLogs";
import { useApiLogs, type ApiLog } from "@/hooks/useApiLogs";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { DataTableWithPagination } from "@/components/dispatch/DataTableWithPagination";
import { StatusBadge } from "@/components/dispatch/StatusBadge";
import { EmptyState } from "@/components/dispatch/EmptyState";
import { MetricCard } from "@/components/dispatch/MetricCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw, Download, Search, CheckCircle, XCircle, Clock, Activity, 
  Loader2, Copy, Check, Eye, Code, ArrowDownLeft, ArrowUpRight
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Node type labels for friendly display
const nodeTypeLabels: Record<string, string> = {
  TEXT: "Texto", IMAGE: "Imagem", VIDEO: "Vídeo", AUDIO: "Áudio",
  DOCUMENT: "Documento", STICKER: "Sticker", BUTTONS: "Botões",
  LIST: "Lista", DELAY: "Delay", CONTACT: "Contato",
  LOCATION: "Localização", POLL: "Enquete",
  text: "Texto", image: "Imagem", video: "Vídeo", audio: "Áudio",
  document: "Documento", sticker: "Sticker", buttons: "Botões",
  list: "Lista", delay: "Delay", contact: "Contato",
  location: "Localização", poll: "Enquete",
  user_input: "Entrada do Usuário",
  dynamic_url: "URL Dinâmica",
};

// API method colors
const methodColors: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  POST: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  PUT: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  DELETE: "bg-rose-500/10 text-rose-600 border-rose-500/30",
};

const getStatusColor = (code: number): string => {
  if (code >= 200 && code < 300) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
  if (code >= 400 && code < 500) return "bg-amber-500/10 text-amber-600 border-amber-500/30";
  if (code >= 500) return "bg-rose-500/10 text-rose-600 border-rose-500/30";
  return "bg-muted text-muted-foreground";
};

type ValidStatus = "sent" | "sending" | "failed" | "pending";

const mapStatus = (status: string): ValidStatus => {
  if (status === "sent" || status === "sending" || status === "failed" || status === "pending") {
    return status;
  }
  return "pending";
};

export interface UnifiedLogItem {
  id: string;
  rawDate: string;
  formattedDate: string;
  direction: "input" | "output";
  source: string;
  destination: string;
  type: string;
  status: string;
  statusCode?: number;
  responseTimeMs: number | null;
  errorMessage?: string | null;
  payload: any;
  responsePayload: any;
  originalType: "dispatch" | "api";
  originalLog: SequenceLog | ApiLog;
}

// Helper to clean legacy wrapper artifacts and extract pure JSON payload
function extractCleanPayloadFromDispatch(log: SequenceLog) {
  let cleanPayload: any = log.payload;

  if (cleanPayload && typeof cleanPayload === "object") {
    const { curl, zapiUrl, zapiBody, ...otherPayload } = cleanPayload as Record<string, any>;
    if (zapiBody && typeof zapiBody === "object") {
      cleanPayload = { ...otherPayload, ...zapiBody };
    } else if (Object.keys(otherPayload).length > 0) {
      cleanPayload = otherPayload;
    }
  }

  return {
    payload: cleanPayload,
    response: log.providerResponse || null,
  };
}

export default function Logs() {
  const { t } = useLanguage();
  const { logs: dispatchLogs, isLoading: isLoadingDispatch, refetch: refetchDispatch } = useSequenceLogs();
  const { logs: apiLogs, isLoading: isLoadingApi, refetch: refetchApi } = useApiLogs();
  const { campaigns } = useGroupCampaigns();
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"all" | "input" | "output">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  // Dialog state
  const [selectedLog, setSelectedLog] = useState<UnifiedLogItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Loading states
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Combine dispatch logs and API logs into a single unified list
  const unifiedLogs: UnifiedLogItem[] = useMemo(() => {
    const list: UnifiedLogItem[] = [];

    // Map dispatch logs (System outbound dispatches -> Output)
    for (const d of dispatchLogs) {
      const { payload, response } = extractCleanPayloadFromDispatch(d);
      list.push({
        id: `dispatch-${d.id}`,
        rawDate: d.sentAt,
        formattedDate: d.sentAt ? format(new Date(d.sentAt), "dd/MM HH:mm:ss") : "-",
        direction: "output",
        source: d.campaignName || "Campanha",
        destination: d.groupName || d.recipientPhone || d.groupJid || "-",
        type: nodeTypeLabels[d.nodeType || ""] || d.nodeType || "Mensagem",
        status: d.status,
        responseTimeMs: d.responseTimeMs,
        errorMessage: d.errorMessage,
        payload,
        responsePayload: response,
        originalType: "dispatch",
        originalLog: d,
      });
    }

    // Map API logs (Webhook calls & API requests)
    for (const a of apiLogs) {
      const isExternalWebhookOut = a.endpoint.startsWith("http://") || a.endpoint.startsWith("https://") || a.endpoint.includes("system-webhook");
      const direction: "input" | "output" = isExternalWebhookOut ? "output" : "input";
      const rawDate = a.createdAt || a.timestamp;

      let formattedDate = a.timestamp;
      if (a.createdAt) {
        try {
          formattedDate = format(new Date(a.createdAt), "dd/MM HH:mm:ss");
        } catch {
          formattedDate = a.timestamp;
        }
      }

      list.push({
        id: `api-${a.id}`,
        rawDate,
        formattedDate,
        direction,
        source: a.apiKeyName && a.apiKeyName !== "API Key" ? a.apiKeyName : (a.ipAddress && a.ipAddress !== "Unknown" ? a.ipAddress : (direction === "input" ? "Webhook" : "Sistema")),
        destination: a.endpoint,
        type: a.method,
        status: `${a.statusCode}`,
        statusCode: a.statusCode,
        responseTimeMs: a.responseTime,
        errorMessage: a.errorMessage,
        payload: a.requestBody || null,
        responsePayload: a.responseBody || null,
        originalType: "api",
        originalLog: a,
      });
    }

    // Sort descending chronologically
    return list.sort((a, b) => {
      const timeA = new Date(a.rawDate).getTime() || 0;
      const timeB = new Date(b.rawDate).getTime() || 0;
      return timeB - timeA;
    });
  }, [dispatchLogs, apiLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return unifiedLogs.filter((log) => {
      // Direction filter
      if (directionFilter !== "all" && log.direction !== directionFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "success") {
          const isSuccess = log.status === "sent" || (log.statusCode && log.statusCode >= 200 && log.statusCode < 300);
          if (!isSuccess) return false;
        } else if (statusFilter === "failed") {
          const isFailed = log.status === "failed" || (log.statusCode && log.statusCode >= 400);
          if (!isFailed) return false;
        } else if (statusFilter === "pending") {
          const isPending = log.status === "sending" || log.status === "pending";
          if (!isPending) return false;
        }
      }

      // Campaign filter (for dispatch logs)
      if (campaignFilter !== "all") {
        if (log.originalType !== "dispatch") return false;
        const seqLog = log.originalLog as SequenceLog;
        if (seqLog.groupCampaignId !== campaignFilter) return false;
      }

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches =
          log.source.toLowerCase().includes(term) ||
          log.destination.toLowerCase().includes(term) ||
          log.type.toLowerCase().includes(term) ||
          log.status.toLowerCase().includes(term) ||
          (log.errorMessage && log.errorMessage.toLowerCase().includes(term));
        if (!matches) return false;
      }

      return true;
    });
  }, [unifiedLogs, directionFilter, statusFilter, campaignFilter, searchTerm]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = unifiedLogs.length;
    const inputs = unifiedLogs.filter((l) => l.direction === "input").length;
    const outputs = unifiedLogs.filter((l) => l.direction === "output").length;
    const failures = unifiedLogs.filter((l) => l.status === "failed" || (l.statusCode && l.statusCode >= 400)).length;
    
    const logsWithTime = unifiedLogs.filter((l) => l.responseTimeMs != null && l.responseTimeMs > 0);
    const avgTime = logsWithTime.length > 0
      ? Math.round(logsWithTime.reduce((acc, l) => acc + (l.responseTimeMs || 0), 0) / logsWithTime.length)
      : 0;

    return { total, inputs, outputs, failures, avgTime };
  }, [unifiedLogs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchDispatch(), refetchApi()]);
    setIsRefreshing(false);
    toast.success("Logs atualizados com sucesso");
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const headers = ["Timestamp", "Sentido", "Origem/Campanha", "Destino/Endpoint", "Tipo", "Status", "Tempo (ms)", "Erro"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          `"${log.formattedDate}"`,
          log.direction.toUpperCase(),
          `"${log.source.replace(/"/g, '""')}"`,
          `"${log.destination.replace(/"/g, '""')}"`,
          `"${log.type}"`,
          log.status,
          log.responseTimeMs || "-",
          `"${(log.errorMessage || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-unificados-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
    toast.success("Logs exportados com sucesso");
  };

  const copyToClipboard = (text: string, isResponse = false) => {
    navigator.clipboard.writeText(text);
    if (isResponse) {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    } else {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
    toast.success("JSON copiado para a área de transferência!");
  };

  // Unified columns
  const columns = [
    {
      key: "formattedDate",
      header: "Timestamp",
      render: (log: UnifiedLogItem) => (
        <span className="font-['JetBrains_Mono'] text-xs text-muted-foreground whitespace-nowrap">
          {log.formattedDate}
        </span>
      ),
    },
    {
      key: "direction",
      header: "Sentido",
      render: (log: UnifiedLogItem) => {
        if (log.direction === "input") {
          return (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 font-mono text-xs w-fit">
              <ArrowDownLeft className="h-3 w-3" />
              Input
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 flex items-center gap-1 font-mono text-xs w-fit">
            <ArrowUpRight className="h-3 w-3" />
            Output
          </Badge>
        );
      },
    },
    {
      key: "source",
      header: "Origem / Campanha",
      render: (log: UnifiedLogItem) => (
        <span className="font-medium text-sm truncate max-w-[190px] block" title={log.source}>
          {log.source}
        </span>
      ),
    },
    {
      key: "destination",
      header: "Destino / Endpoint",
      render: (log: UnifiedLogItem) => (
        <span className="font-mono text-xs truncate max-w-[200px] block text-muted-foreground" title={log.destination}>
          {log.destination}
        </span>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (log: UnifiedLogItem) => {
        if (log.originalType === "api" && methodColors[log.type]) {
          return (
            <Badge variant="outline" className={`font-mono text-xs font-semibold ${methodColors[log.type]}`}>
              {log.type}
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-xs">
            {log.type}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (log: UnifiedLogItem) => {
        if (log.originalType === "dispatch") {
          return <StatusBadge status={mapStatus(log.status)} showDot />;
        }
        if (log.statusCode) {
          return (
            <Badge variant="outline" className={`font-mono text-xs ${getStatusColor(log.statusCode)}`}>
              {log.statusCode}
            </Badge>
          );
        }
        return <Badge variant="secondary">{log.status}</Badge>;
      },
    },
    {
      key: "responseTimeMs",
      header: "Tempo",
      render: (log: UnifiedLogItem) => (
        <span className="text-xs text-muted-foreground font-mono">
          {log.responseTimeMs != null ? `${log.responseTimeMs}ms` : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (log: UnifiedLogItem) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
            setShowDialog(true);
          }}
          title="Ver payload completo"
        >
          <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      ),
    },
  ];

  const isLoading = isLoadingDispatch || isLoadingApi;

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
      <PageHeader
        title={t("logs.title") || "Logs"}
        description={t("logs.description") || "Monitore todos os eventos de entrada e saída do sistema (retenção de 72h)"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar
            </Button>
          </div>
        }
      />

      {/* Retention Info Banner */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">{t("logs.retentionInfo") || "Logs são mantidos por 72 horas"}</span>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Total" value={stats.total} icon={Activity} />
        <MetricCard title="Inputs (Entradas)" value={stats.inputs} icon={ArrowDownLeft} />
        <MetricCard title="Outputs (Saídas)" value={stats.outputs} icon={ArrowUpRight} />
        <MetricCard title="Falhas" value={stats.failures} icon={XCircle} />
        <MetricCard title="Tempo Médio" value={`${stats.avgTime}ms`} icon={Clock} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por campanha, destino, endpoint ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Direction Filter */}
        <Select value={directionFilter} onValueChange={(val: any) => setDirectionFilter(val)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sentido" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Sentidos</SelectItem>
            <SelectItem value="input">Input (Entrada)</SelectItem>
            <SelectItem value="output">Output (Saída)</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="success">Sucesso / Enviados</SelectItem>
            <SelectItem value="failed">Falhas / Erros</SelectItem>
            <SelectItem value="pending">Pendente / Enviando</SelectItem>
          </SelectContent>
        </Select>

        {/* Campaign Filter */}
        {(campaigns.length > 0 || dispatchCampaigns.length > 0) && (
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {campaigns?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              {dispatchCampaigns?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Unified Table */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          title="Nenhum log encontrado"
          description="Nenhum evento registrado corresponde aos filtros selecionados"
          icon={Activity}
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

      {/* Unified Event Payload Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <DialogTitle>Detalhes do Log</DialogTitle>
                {selectedLog && (
                  selectedLog.direction === "input" ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 flex items-center gap-1 font-mono text-xs">
                      <ArrowDownLeft className="h-3 w-3" />
                      Input (Entrada)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/30 flex items-center gap-1 font-mono text-xs">
                      <ArrowUpRight className="h-3 w-3" />
                      Output (Saída)
                    </Badge>
                  )
                )}
              </div>
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-5 pt-2">
              {/* Metadata summary grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/40 border border-border/60 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Timestamp</p>
                  <p className="font-mono font-medium text-xs mt-0.5">{selectedLog.formattedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-0.5">
                    {selectedLog.originalType === "dispatch" ? (
                      <StatusBadge status={mapStatus(selectedLog.status)} showDot />
                    ) : (
                      <Badge variant="outline" className={`font-mono text-xs ${getStatusColor(selectedLog.statusCode || 200)}`}>
                        {selectedLog.statusCode || selectedLog.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo / Método</p>
                  <p className="font-medium text-xs mt-0.5">{selectedLog.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tempo de Resposta</p>
                  <p className="font-mono font-medium text-xs mt-0.5">
                    {selectedLog.responseTimeMs != null ? `${selectedLog.responseTimeMs}ms` : "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Origem / Campanha</p>
                  <p className="font-medium text-xs mt-0.5 truncate">{selectedLog.source}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Destino / Endpoint</p>
                  <p className="font-mono text-xs mt-0.5 truncate">{selectedLog.destination}</p>
                </div>
              </div>

              {/* Error box if present */}
              {selectedLog.errorMessage && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-xs font-semibold text-destructive mb-1">Erro</p>
                  <p className="text-xs text-destructive font-mono whitespace-pre-wrap">{selectedLog.errorMessage}</p>
                </div>
              )}

              {/* Payload JSON Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">
                      {selectedLog.direction === "input" ? "Payload Recebido (JSON)" : "Payload Enviado (JSON)"}
                    </p>
                  </div>
                  {selectedLog.payload && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.payload, null, 2), false)}
                    >
                      {copiedPayload ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copiar JSON
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {selectedLog.payload && Object.keys(selectedLog.payload).length > 0 ? (
                  <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-[360px] border border-slate-800 leading-relaxed shadow-inner">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                ) : (
                  <div className="p-4 bg-muted/40 rounded-lg text-xs text-muted-foreground italic border text-center">
                    Nenhum payload registrado para este log.
                  </div>
                )}
              </div>

              {/* Response / Provider Response JSON Section (if exists) */}
              {selectedLog.responsePayload && Object.keys(selectedLog.responsePayload).length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Resposta do Sistema / Retorno (JSON)</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.responsePayload, null, 2), true)}
                    >
                      {copiedResponse ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copiar Resposta
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-[260px] border border-slate-800 leading-relaxed shadow-inner">
                    {JSON.stringify(selectedLog.responsePayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
