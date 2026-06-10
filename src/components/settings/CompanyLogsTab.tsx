import { useState } from "react";
import { useLanguage } from "@/i18n";
import { useCompanySequenceLogs, SequenceLog } from "@/hooks/useSequenceLogs";
import { useCompanyApiLogs, type ApiLog } from "@/hooks/useApiLogs";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { DataTableWithPagination } from "@/components/dispatch/DataTableWithPagination";
import { StatusBadge } from "@/components/dispatch/StatusBadge";
import { EmptyState } from "@/components/dispatch/EmptyState";
import { MetricCard } from "@/components/dispatch/MetricCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  RefreshCw, Download, Search, Send, CheckCircle, XCircle, Clock, Activity, 
  Loader2, FileText
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Node type labels for dispatch logs
const nodeTypeLabels: Record<string, string> = {
  TEXT: "Texto", IMAGE: "Imagem", VIDEO: "Vídeo", AUDIO: "Áudio",
  DOCUMENT: "Documento", STICKER: "Sticker", BUTTONS: "Botões",
  LIST: "Lista", DELAY: "Delay", CONTACT: "Contato",
  LOCATION: "Localização", POLL: "Enquete",
  text: "Texto", image: "Imagem", video: "Vídeo", audio: "Áudio",
  document: "Documento", sticker: "Sticker", buttons: "Botões",
  list: "Lista", delay: "Delay", contact: "Contato",
  location: "Localização", poll: "Enquete",
};

// API method colors
const methodColors: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  POST: "bg-success/10 text-success border-success/30",
  PUT: "bg-warning/10 text-warning border-warning/30",
  DELETE: "bg-error/10 text-error border-error/30",
};

const getStatusColor = (code: number): string => {
  if (code >= 200 && code < 300) return "bg-success/10 text-success border-success/30";
  if (code >= 400 && code < 500) return "bg-warning/10 text-warning border-warning/30";
  if (code >= 500) return "bg-error/10 text-error border-error/30";
  return "bg-muted text-muted-foreground";
};

type ValidStatus = "sent" | "sending" | "failed" | "pending";

const mapStatus = (status: string): ValidStatus => {
  if (status === "sent" || status === "sending" || status === "failed" || status === "pending") {
    return status;
  }
  return "pending";
};

interface CompanyLogsTabProps {
  companyId: string | undefined;
}

export function CompanyLogsTab({ companyId }: CompanyLogsTabProps) {
  const { t } = useLanguage();
  const { logs: dispatchLogs, isLoading: isLoadingDispatch, refetch: refetchDispatch } = useCompanySequenceLogs(companyId);
  const { logs: apiLogs, isLoading: isLoadingApi, refetch: refetchApi } = useCompanyApiLogs(companyId);
  const { campaigns } = useGroupCampaigns();
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>("dispatch");
  
  // Dispatch logs state
  const [dispatchSearch, setDispatchSearch] = useState("");
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState<string>("all");
  const [dispatchCampaignFilter, setDispatchCampaignFilter] = useState<string>("all");
  const [selectedDispatchLog, setSelectedDispatchLog] = useState<SequenceLog | null>(null);
  const [showDispatchDialog, setShowDispatchDialog] = useState(false);
  
  // API logs state
  const [apiSearch, setApiSearch] = useState("");
  const [apiMethodFilter, setApiMethodFilter] = useState<string>("all");
  const [apiStatusFilter, setApiStatusFilter] = useState<string>("all");
  const [selectedApiLog, setSelectedApiLog] = useState<ApiLog | null>(null);
  const [showApiDialog, setShowApiDialog] = useState(false);
  
  // Loading states
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter dispatch logs
  const filteredDispatchLogs = dispatchLogs.filter((log) => {
    const matchesSearch =
      !dispatchSearch ||
      log.campaignName?.toLowerCase().includes(dispatchSearch.toLowerCase()) ||
      log.groupName?.toLowerCase().includes(dispatchSearch.toLowerCase()) ||
      log.nodeType?.toLowerCase().includes(dispatchSearch.toLowerCase());
    const matchesStatus = dispatchStatusFilter === "all" || log.status === dispatchStatusFilter;
    const matchesCampaign = dispatchCampaignFilter === "all" || log.groupCampaignId === dispatchCampaignFilter;
    return matchesSearch && matchesStatus && matchesCampaign;
  });

  // Filter API logs
  const filteredApiLogs = apiLogs.filter((log) => {
    const matchesSearch =
      log.endpoint.toLowerCase().includes(apiSearch.toLowerCase()) ||
      log.ipAddress.includes(apiSearch) ||
      log.apiKeyName.toLowerCase().includes(apiSearch.toLowerCase());
    const matchesMethod = apiMethodFilter === "all" || log.method === apiMethodFilter;
    const matchesStatus =
      apiStatusFilter === "all" ||
      (apiStatusFilter === "success" && log.statusCode >= 200 && log.statusCode < 300) ||
      (apiStatusFilter === "client_error" && log.statusCode >= 400 && log.statusCode < 500) ||
      (apiStatusFilter === "server_error" && log.statusCode >= 500);
    return matchesSearch && matchesMethod && matchesStatus;
  });

  // Dispatch stats
  const dispatchStats = {
    total: dispatchLogs.length,
    sent: dispatchLogs.filter((l) => l.status === "sent").length,
    sending: dispatchLogs.filter((l) => l.status === "sending").length,
    failed: dispatchLogs.filter((l) => l.status === "failed").length,
    avgTime: dispatchLogs.filter((l) => l.responseTimeMs).length > 0
      ? Math.round(dispatchLogs.filter((l) => l.responseTimeMs).reduce((acc, l) => acc + (l.responseTimeMs || 0), 0) / dispatchLogs.filter((l) => l.responseTimeMs).length)
      : 0,
  };

  // API stats
  const apiStats = {
    total: apiLogs.length,
    success: apiLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length,
    avgTime: apiLogs.length > 0 ? Math.round(apiLogs.reduce((acc, l) => acc + l.responseTime, 0) / apiLogs.length) : 0,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === "dispatch") {
      await refetchDispatch();
    } else {
      await refetchApi();
    }
    setIsRefreshing(false);
    toast.success("Logs atualizados");
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (activeTab === "dispatch") {
      const headers = ["Timestamp", "Campanha", "Destino", "Tipo", "Status", "Tempo (ms)", "Erro"];
      const csvContent = [
        headers.join(","),
        ...filteredDispatchLogs.map((log) =>
          [log.sentAt, log.campaignName || "-", log.groupName || "-", log.nodeType || "-", log.status, log.responseTimeMs || "-", log.errorMessage || "-"].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `company-dispatch-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["Timestamp", "Method", "Endpoint", "Status", "Response Time (ms)", "IP", "API Key", "Error"];
      const csvContent = [
        headers.join(","),
        ...filteredApiLogs.map((log) =>
          [log.timestamp, log.method, log.endpoint, log.statusCode, log.responseTime, log.ipAddress, `"${log.apiKeyName}"`, log.errorMessage || ""].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `company-api-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setIsExporting(false);
    toast.success("Logs exportados");
  };

  // Dispatch columns
  const dispatchColumns = [
    {
      key: "sentAt",
      header: "Timestamp",
      render: (log: SequenceLog) => (
        <span className="font-['JetBrains_Mono'] text-xs text-muted-foreground">
          {format(new Date(log.sentAt), "dd/MM HH:mm:ss")}
        </span>
      ),
    },
    {
      key: "campaignName",
      header: "Campanha",
      render: (log: SequenceLog) => (
        <span className="font-medium">{log.campaignName || "-"}</span>
      ),
    },
    {
      key: "groupName",
      header: "Destino",
      render: (log: SequenceLog) => (
        <span className="text-sm">{log.groupName || "-"}</span>
      ),
    },
    {
      key: "nodeType",
      header: "Tipo",
      render: (log: SequenceLog) => (
        <Badge variant="outline" className="text-xs">
          {nodeTypeLabels[log.nodeType || ""] || log.nodeType || "-"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (log: SequenceLog) => (
        <StatusBadge status={mapStatus(log.status)} showDot />
      ),
    },
    {
      key: "responseTimeMs",
      header: "Tempo",
      render: (log: SequenceLog) => (
        <span className="text-sm text-muted-foreground">
          {log.responseTimeMs ? `${log.responseTimeMs}ms` : "-"}
        </span>
      ),
    },
  ];

  // API columns
  const apiColumns = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (log: ApiLog) => <span className="font-['JetBrains_Mono'] text-xs text-muted-foreground">{log.timestamp}</span>,
    },
    {
      key: "method",
      header: "Método",
      render: (log: ApiLog) => (
        <Badge variant="outline" className={`font-mono font-medium ${methodColors[log.method]}`}>
          {log.method}
        </Badge>
      ),
      className: "w-24",
    },
    {
      key: "endpoint",
      header: "Endpoint",
      render: (log: ApiLog) => <span className="font-mono text-sm">{log.endpoint}</span>,
    },
    {
      key: "statusCode",
      header: "Status",
      render: (log: ApiLog) => (
        <Badge variant="outline" className={`font-mono ${getStatusColor(log.statusCode)}`}>
          {log.statusCode}
        </Badge>
      ),
      className: "w-20",
    },
    {
      key: "responseTime",
      header: "Tempo",
      render: (log: ApiLog) => (
        <span className={`font-mono text-sm ${log.responseTime > 1000 ? "text-warning" : ""}`}>
          {log.responseTime}ms
        </span>
      ),
      className: "w-28",
    },
    {
      key: "apiKeyName",
      header: "API Key",
      render: (log: ApiLog) => (
        <Badge variant="secondary" className="font-normal">
          {log.apiKeyName}
        </Badge>
      ),
    },
  ];

  const isLoading = activeTab === "dispatch" ? isLoadingDispatch : isLoadingApi;

  return (
    <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-colors hover:border-[#8A3CFF]/20">
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">Logs da Empresa</CardTitle>
              <CardDescription className="text-xs font-medium text-muted-foreground/60">
                Monitore envios e chamadas da API específicos da sua organização (retenção de 72h).
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting || isLoading}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-6 py-10">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-92" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="dispatch" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Logs de Envio
              </TabsTrigger>
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Logs da API
              </TabsTrigger>
            </TabsList>

            {/* Dispatch Logs */}
            <TabsContent value="dispatch" className="space-y-6 outline-none">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard title="Total" value={dispatchStats.total} icon={Activity} />
                <MetricCard title="Enviados" value={dispatchStats.sent} icon={CheckCircle} />
                <MetricCard title="Enviando" value={dispatchStats.sending} icon={Send} />
                <MetricCard title="Falhas" value={dispatchStats.failed} icon={XCircle} />
                <MetricCard title="Tempo Médio" value={`${dispatchStats.avgTime}ms`} icon={Clock} />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por campanha, destino ou tipo..."
                    value={dispatchSearch}
                    onChange={(e) => setDispatchSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={dispatchCampaignFilter} onValueChange={setDispatchCampaignFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as campanhas</SelectItem>
                    {campaigns?.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                    {dispatchCampaigns?.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dispatchStatusFilter} onValueChange={setDispatchStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sent">Enviado</SelectItem>
                    <SelectItem value="sending">Enviando</SelectItem>
                    <SelectItem value="failed">Falha</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredDispatchLogs.length === 0 ? (
                <EmptyState
                  title="Nenhum log encontrado"
                  description="Os logs de envio aparecerão aqui quando você enviar mensagens"
                  icon={Activity}
                />
              ) : (
                <DataTableWithPagination
                  columns={dispatchColumns}
                  data={filteredDispatchLogs}
                  keyExtractor={(log) => log.id}
                  onRowClick={(log) => {
                    setSelectedDispatchLog(log);
                    setShowDispatchDialog(true);
                  }}
                />
              )}
            </TabsContent>

            {/* API Logs */}
            <TabsContent value="api" className="space-y-6 outline-none">
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-mono font-semibold">{apiStats.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-muted-foreground">Taxa de Sucesso:</span>
                  <span className="font-mono font-semibold">
                    {apiStats.total > 0 ? Math.round((apiStats.success / apiStats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Tempo Médio:</span>
                  <span className="font-mono font-semibold">{apiStats.avgTime}ms</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por endpoint, IP ou chave API..."
                    value={apiSearch}
                    onChange={(e) => setApiSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={apiMethodFilter} onValueChange={setApiMethodFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={apiStatusFilter} onValueChange={setApiStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="success">2xx (Success)</SelectItem>
                    <SelectItem value="client_error">4xx (Client Error)</SelectItem>
                    <SelectItem value="server_error">5xx (Server Error)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredApiLogs.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="Nenhum log de API encontrado"
                  description="Logs de chamadas à API aparecerão aqui"
                />
              ) : (
                <DataTableWithPagination
                  columns={apiColumns}
                  data={filteredApiLogs}
                  keyExtractor={(log) => log.id}
                  onRowClick={(log) => {
                    setSelectedApiLog(log);
                    setShowApiDialog(true);
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      {/* Dispatch Detail Dialog */}
      <Dialog open={showDispatchDialog} onOpenChange={setShowDispatchDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Envio</DialogTitle>
          </DialogHeader>
          {selectedDispatchLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p className="font-medium">
                      {format(new Date(selectedDispatchLog.sentAt), "dd/MM/yyyy HH:mm:ss")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <StatusBadge status={mapStatus(selectedDispatchLog.status)} showDot />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Campanha</p>
                    <p className="font-medium">{selectedDispatchLog.campaignName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Destino</p>
                    <p className="font-medium">{selectedDispatchLog.groupName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Node</p>
                    <Badge variant="outline">
                      {nodeTypeLabels[selectedDispatchLog.nodeType || ""] || selectedDispatchLog.nodeType || "-"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo de Resposta</p>
                    <p className="font-medium">
                      {selectedDispatchLog.responseTimeMs ? `${selectedDispatchLog.responseTimeMs}ms` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Instância</p>
                    <p className="font-medium">{selectedDispatchLog.instanceName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Group JID</p>
                    <p className="font-mono text-xs">{selectedDispatchLog.groupJid || "-"}</p>
                  </div>
                </div>

                {selectedDispatchLog.errorMessage && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Erro</p>
                    <p className="text-sm text-destructive">{selectedDispatchLog.errorMessage}</p>
                  </div>
                )}

                {selectedDispatchLog.payload && Object.keys(selectedDispatchLog.payload).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Payload</p>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto max-h-48">
                      {JSON.stringify(selectedDispatchLog.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* API Detail Dialog */}
      <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Chamada</DialogTitle>
            <DialogDescription>
              {selectedApiLog?.method} {selectedApiLog?.endpoint}
            </DialogDescription>
          </DialogHeader>
          {selectedApiLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`font-mono ${getStatusColor(selectedApiLog.statusCode)}`}>
                    {selectedApiLog.statusCode}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-mono text-sm">{selectedApiLog.timestamp}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tempo de Resposta</p>
                  <p className="font-mono text-sm">{selectedApiLog.responseTime}ms</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono text-sm">{selectedApiLog.ipAddress}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">API Key</p>
                  <Badge variant="secondary">{selectedApiLog.apiKeyName}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Método</p>
                  <Badge variant="outline" className={`font-mono ${methodColors[selectedApiLog.method]}`}>
                    {selectedApiLog.method}
                  </Badge>
                </div>
              </div>

              {selectedApiLog.errorMessage && (
                <div className="rounded-lg border border-error/30 bg-error/10 p-3">
                  <p className="text-sm font-medium text-error">Erro</p>
                  <p className="text-sm text-muted-foreground">{selectedApiLog.errorMessage}</p>
                </div>
              )}

              {selectedApiLog.requestBody && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Request Body</p>
                  <ScrollArea className="h-32 rounded-lg border bg-muted/50 p-3">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(selectedApiLog.requestBody, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {selectedApiLog.responseBody && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Response Body</p>
                  <ScrollArea className="h-32 rounded-lg border bg-muted/50 p-3">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(selectedApiLog.responseBody, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
