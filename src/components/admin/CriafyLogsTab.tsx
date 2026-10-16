import { useState, useMemo } from "react";
import { useCriafyLogs, CriafyLogItem } from "@/hooks/useCriafyLogs";
import { MetricCard } from "@/components/dispatch/MetricCard";
import { DataTableWithPagination } from "@/components/dispatch/DataTableWithPagination";
import { EmptyState } from "@/components/dispatch/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw, Download, Search, CheckCircle, XCircle, Clock, Activity, 
  Loader2, Copy, Check, Eye, ExternalLink, Instagram, AlertTriangle, FileVideo, FileImage
} from "lucide-react";
import { toast } from "sonner";

export function CriafyLogsTab() {
  const { logs, isLoading, refetch } = useCriafyLogs();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");

  const [selectedLog, setSelectedLog] = useState<CriafyLogItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Accounts list for filtering
  const accountsList = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((log) => {
      const acc = log.publication?.account;
      if (acc?.id && acc.username) {
        map.set(acc.id, acc.username);
      }
    });
    return Array.from(map.entries()).map(([id, username]) => ({ id, username }));
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter !== "all" && log.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== "all") {
        const pubType = log.publication?.publicationType;
        if (pubType !== typeFilter) return false;
      }

      if (accountFilter !== "all") {
        const accId = log.publication?.account?.id;
        if (accId !== accountFilter) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const username = log.publication?.account?.username?.toLowerCase() || "";
        const pubId = log.publicationId.toLowerCase();
        const errMsg = log.errorMessage?.toLowerCase() || "";
        const errCode = log.errorCode?.toLowerCase() || "";
        const caption = log.publication?.caption?.toLowerCase() || "";
        const mediaTitle = log.publication?.content?.title?.toLowerCase() || "";

        const matches =
          username.includes(term) ||
          pubId.includes(term) ||
          errMsg.includes(term) ||
          errCode.includes(term) ||
          caption.includes(term) ||
          mediaTitle.includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [logs, statusFilter, typeFilter, accountFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const successes = logs.filter((l) => l.status === "SUCCESS").length;
    const failures = logs.filter((l) => l.status === "FAILED").length;
    const rate = total > 0 ? Math.round((successes / total) * 100) : 0;
    const lastAttempt = logs.length > 0 ? logs[0].formattedDate : "-";

    return { total, successes, failures, rate, lastAttempt };
  }, [logs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Logs da Qualify / Criafy atualizados com sucesso!");
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
      downloadAnchor.setAttribute("download", `qualify-criafy-logs-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Logs exportados em formato JSON!");
    } catch {
      toast.error("Erro ao exportar logs.");
    }
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
    toast.success("Copiado para a área de transferência!");
  };

  const columns = [
    {
      key: "attemptedAt",
      header: "Data / Hora",
      render: (log: CriafyLogItem) => (
        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
          {log.formattedDate}
        </span>
      ),
    },
    {
      key: "account",
      header: "Conta Instagram",
      render: (log: CriafyLogItem) => {
        const acc = log.publication?.account;
        if (!acc) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 ring-1 ring-primary/20">
              <AvatarImage src={acc.profilePictureUrl || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {acc.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-foreground">@{acc.username}</span>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Tipo",
      render: (log: CriafyLogItem) => {
        const type = log.publication?.publicationType || "REEL";
        const isVideo = type.includes("VIDEO") || type === "REEL";
        return (
          <Badge variant="outline" className="text-[11px] gap-1 font-semibold">
            {isVideo ? <FileVideo className="h-3 w-3 text-purple-500" /> : <FileImage className="h-3 w-3 text-blue-500" />}
            {type}
          </Badge>
        );
      },
    },
    {
      key: "content",
      header: "Mídia & Legenda",
      render: (log: CriafyLogItem) => {
        const content = log.publication?.content;
        const caption = log.publication?.caption;
        return (
          <div className="max-w-xs truncate text-xs">
            <p className="font-medium text-foreground truncate">
              {content?.title || "Sem título"}
              {content?.aspectRatio ? ` (${content.aspectRatio})` : ""}
            </p>
            {caption ? (
              <p className="text-muted-foreground truncate">{caption}</p>
            ) : (
              <p className="text-muted-foreground/60 italic">Sem legenda</p>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (log: CriafyLogItem) => {
        if (log.status === "SUCCESS") {
          return (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" /> Publicado
            </Badge>
          );
        }
        if (log.status === "FAILED") {
          return (
            <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs">
              <XCircle className="h-3 w-3 mr-1" /> Falha
            </Badge>
          );
        }
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Publicando
          </Badge>
        );
      },
    },
    {
      key: "code",
      header: "Código / Erro",
      render: (log: CriafyLogItem) => {
        if (log.status === "SUCCESS") {
          return <span className="font-mono text-xs text-emerald-600">200 OK</span>;
        }
        const code = log.errorCode || "Erro";
        return (
          <div className="flex flex-col">
            <Badge variant="outline" className="font-mono text-[10px] bg-rose-50 text-rose-600 border-rose-200 w-fit">
              {code}
            </Badge>
            {log.errorMessage && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={log.errorMessage}>
                {log.errorMessage}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (log: CriafyLogItem) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
            setShowDialog(true);
          }}
          title="Ver payload e respostas da Meta"
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Extract clean request payload and Meta response payload from log
  const requestPayloadData = selectedLog?.rawResponseSanitized?.request || {
    publication_id: selectedLog?.publicationId,
    publication_type: selectedLog?.publication?.publicationType,
    caption: selectedLog?.publication?.caption,
    media_url: selectedLog?.publication?.content?.mediaUrl,
    media_type: selectedLog?.publication?.content?.mediaType,
    account_username: selectedLog?.publication?.account?.username,
    instagram_user_id: selectedLog?.publication?.account?.instagramAccountId,
    dimensions: selectedLog?.publication?.content?.width ? `${selectedLog?.publication?.content?.width}x${selectedLog?.publication?.content?.height}` : null,
    aspect_ratio: selectedLog?.publication?.content?.aspectRatio,
  };

  const responsePayloadData = selectedLog?.rawResponseSanitized?.response || selectedLog?.rawResponseSanitized;

  return (
    <div className="space-y-6">
      {/* Banner de Informação do Criafy / Meta */}
      <div className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-purple-600" />
          <div>
            <span className="font-medium text-foreground">Logs de Disparos Qualify & Meta Instagram Graph API</span>
            <p className="text-xs text-muted-foreground">
              Monitore requisições de publicação de Reels, Feed e Stories, códigos de erro da Meta e respostas completas da API.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Total de Disparos" value={stats.total} icon={Activity} />
        <MetricCard title="Publicados com Sucesso" value={stats.successes} icon={CheckCircle} />
        <MetricCard title="Falhas / Erros Meta" value={stats.failures} icon={XCircle} />
        <MetricCard title="Taxa de Entrega" value={`${stats.rate}%`} icon={Instagram} />
        <MetricCard title="Último Disparo" value={stats.lastAttempt.split(" ")[0]} icon={Clock} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por conta, ID, legenda, erro ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="SUCCESS">Sucesso (200 OK)</SelectItem>
            <SelectItem value="FAILED">Falhas (Erros)</SelectItem>
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="REEL">Reels (Vídeo)</SelectItem>
            <SelectItem value="FEED">Feed</SelectItem>
            <SelectItem value="STORY_IMAGE">Story Imagem</SelectItem>
            <SelectItem value="STORY_VIDEO">Story Vídeo</SelectItem>
          </SelectContent>
        </Select>

        {/* Account Filter */}
        {accountsList.length > 0 && (
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Conta Instagram" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Contas</SelectItem>
              {accountsList.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  @{acc.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          title="Nenhum log encontrado"
          description="Nenhum disparo registrado corresponde aos filtros selecionados"
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

      {/* Event Payload & Response Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-purple-600" />
                <span>Detalhes da Publicação & Meta Graph API</span>
              </DialogTitle>
              {selectedLog?.status === "SUCCESS" ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Publicado
                </Badge>
              ) : (
                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Falha Meta
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2">
              {/* Informações da Publicação */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground block">Conta:</span>
                  <span className="font-semibold text-foreground">
                    @{selectedLog.publication?.account?.username || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Tipo:</span>
                  <span className="font-semibold text-foreground">
                    {selectedLog.publication?.publicationType || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Data / Hora:</span>
                  <span className="font-mono text-foreground">{selectedLog.formattedDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Código / Subcódigo:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {selectedLog.errorCode || (selectedLog.status === "SUCCESS" ? "200" : "-")}
                  </span>
                </div>
              </div>

              {/* Se publicado com sucesso: link do Instagram */}
              {selectedLog.status === "SUCCESS" && selectedLog.publication?.igPermalink && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span>Publicação ativa no Instagram! Media ID: <b>{selectedLog.publication.igMediaId}</b></span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => window.open(selectedLog.publication?.igPermalink!, "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver no Instagram
                  </Button>
                </div>
              )}

              {/* Se falhou: Alerta explicativo */}
              {selectedLog.status === "FAILED" && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Erro Retornado pela Meta Graph API</span>
                  </div>
                  <p className="font-mono text-xs">{selectedLog.errorMessage || "Erro desconhecido"}</p>
                  {selectedLog.errorCode === "2207085" && (
                    <p className="text-[11px] text-rose-700/80 mt-1">
                      💡 <b>Diagnóstico Técnico Meta (2207085: Fatal):</b> O container foi gerado, porém o vídeo não pôde ser publicado. As causas mais comuns são: (1) O arquivo de vídeo possui o átomo <code>moov</code> posicionado no final em vez do início (falta a flag <code>-movflags +faststart</code>), ou (2) Formato de proporção diferente do recomendado (9:16 vertical), ou (3) Conflito temporário de roteamento nos servidores da Meta.
                    </p>
                  )}
                </div>
              )}

              {/* Request Payload JSON */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Payload da Requisição (Enviado para a Meta)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => copyToClipboard(JSON.stringify(requestPayloadData, null, 2), false)}
                  >
                    {copiedPayload ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedPayload ? "Copiado!" : "Copiar Payload"}
                  </Button>
                </div>
                <pre className="bg-slate-950 text-slate-50 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-56">
                  {JSON.stringify(requestPayloadData, null, 2)}
                </pre>
              </div>

              {/* Response Payload JSON */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resposta da Meta Graph API (Raw Response)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => copyToClipboard(JSON.stringify(responsePayloadData, null, 2), true)}
                  >
                    {copiedResponse ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedResponse ? "Copiado!" : "Copiar Resposta"}
                  </Button>
                </div>
                <pre className="bg-slate-950 text-slate-50 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-64">
                  {JSON.stringify(responsePayloadData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
