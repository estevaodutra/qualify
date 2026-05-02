import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Radio, RefreshCw, Download, ChevronLeft, ChevronRight, Search, Copy, Eye, RotateCw, Ban, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DataTable, Column } from "@/components/dispatch/DataTable";
import { MetricCard } from "@/components/dispatch/MetricCard";
import { PageHeader } from "@/components/dispatch/PageHeader";
import {
  useWebhookEvents,
  useWebhookEventById,
  useWebhookEventStats,
  useClassifyEvent,
  useReprocessEvent,
  useIgnoreEvent,
  useReclassifyAllEvents,
  getEventCategory,
  WebhookEvent,
  WebhookEventFilters,
} from "@/hooks/useWebhookEvents";
import { useInstances } from "@/hooks/useInstances";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  "text_message", "image_message", "video_message", "audio_message",
  "document_message", "sticker_message", "location_message", "contact_message",
  "message_status", "message_reaction", "message_revoked", "message_received", "message_read", "read_by_me",
  "button_response", "list_response", "poll_response",
  "group_join", "group_leave", "group_promote", "group_demote", "group_update",
  "connection_status", "qrcode_update",
  "call_received",
  "reaction",
  "played",
  "unknown",
];

const CATEGORY_COLORS: Record<string, string> = {
  messages: "bg-blue-500/10 text-blue-600 border-blue-200",
  interactive: "bg-green-500/10 text-green-600 border-green-200",
  groups: "bg-purple-500/10 text-purple-600 border-purple-200",
  connection: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  calls: "bg-orange-500/10 text-orange-600 border-orange-200",
  pending: "bg-gray-500/10 text-gray-600 border-gray-200",
};

const PROCESSING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  processed: "bg-green-500/10 text-green-600 border-green-200",
  failed: "bg-red-500/10 text-red-600 border-red-200",
  ignored: "bg-gray-500/10 text-gray-600 border-gray-200",
};

function EventTypeBadge({ eventType }: { eventType: string }) {
  const category = getEventCategory(eventType);
  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.pending;
  
  return (
    <Badge variant="outline" className={colorClass}>
      {eventType.replace(/_/g, " ")}
    </Badge>
  );
}

function ProcessingStatusBadge({ status }: { status: string }) {
  const colorClass = PROCESSING_STATUS_COLORS[status] || PROCESSING_STATUS_COLORS.pending;
  
  return (
    <Badge variant="outline" className={colorClass}>
      {status}
    </Badge>
  );
}

export default function WebhookEvents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState<WebhookEventFilters>({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showClassifyDialog, setShowClassifyDialog] = useState(false);
  const [newEventType, setNewEventType] = useState("");
  const [isEditingEventType, setIsEditingEventType] = useState(false);
  const [editedEventType, setEditedEventType] = useState("");
  
  const { instances } = useInstances();
  const { data: stats, refetch: refetchStats } = useWebhookEventStats();
  
  // Build filters based on active tab
  const activeFilters: WebhookEventFilters = {
    ...filters,
    ...(activeTab === "pending" && { classification: "pending" }),
    ...(activeTab === "identified" && { classification: "identified" }),
    ...(activeTab === "processed" && { processingStatus: "processed" }),
    ...(activeTab === "failed" && { processingStatus: "failed" }),
  };
  
  const { data, isLoading, refetch } = useWebhookEvents(activeFilters, page);
  const { data: selectedEvent, refetch: refetchSelectedEvent } = useWebhookEventById(selectedEventId || "");
  const classifyMutation = useClassifyEvent();
  const reprocessMutation = useReprocessEvent();
  const ignoreMutation = useIgnoreEvent();
  const reclassifyMutation = useReclassifyAllEvents();

  // Invalidate individual event cache when opening modal
  useEffect(() => {
    if (selectedEventId) {
      queryClient.invalidateQueries({ queryKey: ["webhook-event", selectedEventId] });
    }
  }, [selectedEventId, queryClient]);

  const handleRefresh = () => {
    refetch();
    refetchStats();
    toast({ title: "Atualizado", description: "Eventos atualizados" });
  };
  
  const handleReclassifyAll = async () => {
    toast({ title: "Reclassificando...", description: "Processando todos os eventos com a lógica atualizada" });
    try {
      let totalReclassified = 0;
      let totalProcessed = 0;
      let hasMore = true;
      let lastId: string | null = null;
      
      while (hasMore) {
        const result = await reclassifyMutation.mutateAsync({ lastId });
        totalReclassified += result.reclassified;
        totalProcessed += result.total_processed;
        lastId = (result as any).last_id || null;
        hasMore = (result as any).has_more === true;
        
        if (hasMore) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
      
      toast({
        title: "Reclassificação concluída",
        description: `${totalReclassified} eventos reclassificados de ${totalProcessed} processados`,
      });
      await queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      refetchStats();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao reclassificar eventos",
        variant: "destructive",
      });
    }
  };
  
  const handleCopyPayload = () => {
    if (selectedEvent) {
      navigator.clipboard.writeText(JSON.stringify(selectedEvent.rawEvent, null, 2));
      toast({ title: "Copiado", description: "Payload copiado para a área de transferência" });
    }
  };
  
  const handleClassify = async () => {
    if (selectedEventId && newEventType) {
      await classifyMutation.mutateAsync({ id: selectedEventId, eventType: newEventType });
      toast({ title: "Classificado", description: "Evento classificado com sucesso" });
      setShowClassifyDialog(false);
      setSelectedEventId(null);
    }
  };
  
  const handleSaveEventType = async () => {
    if (selectedEvent && editedEventType && editedEventType !== selectedEvent.eventType) {
      await classifyMutation.mutateAsync({ id: selectedEvent.id, eventType: editedEventType });
      toast({ title: "Tipo alterado", description: `Evento reclassificado para "${editedEventType.replace(/_/g, " ")}"` });
      setIsEditingEventType(false);
      refetchSelectedEvent();
    } else {
      setIsEditingEventType(false);
    }
  };
  
  const handleReprocess = async (event: WebhookEvent) => {
    try {
      const result = await reprocessMutation.mutateAsync(event.id);
      toast({
        title: "Evento reclassificado",
        description: `Tipo: ${result.event_type}, Status: ${result.processing_status}`,
      });
      refetchSelectedEvent();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao reprocessar evento",
        variant: "destructive",
      });
    }
  };
  
  const handleIgnore = async (event: WebhookEvent) => {
    await ignoreMutation.mutateAsync(event.id);
    toast({ title: "Ignorado", description: "Evento marcado como ignorado" });
    setSelectedEventId(null);
  };
  
  const columns: Column<WebhookEvent>[] = [
    {
      key: "id",
      header: "ID",
      render: (event) => (
        <span className="font-mono text-xs text-muted-foreground">
          {event.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "receivedAt",
      header: "Data/Hora",
      render: (event) => (
        <span className="text-sm">
          {format(new Date(event.receivedAt), "dd/MM/yyyy HH:mm")}
        </span>
      ),
    },
    {
      key: "eventType",
      header: "Tipo",
      render: (event) => <EventTypeBadge eventType={event.eventType} />,
    },
    {
      key: "chatName",
      header: "Chat",
      render: (event) => (
        <span className="text-sm truncate max-w-[150px] block">
          {event.chatName || event.chatJid || "-"}
        </span>
      ),
    },
    {
      key: "senderName",
      header: "Remetente",
      render: (event) => (
        <span className="text-sm truncate max-w-[120px] block">
          {event.senderName || event.senderPhone || "-"}
        </span>
      ),
    },
    {
      key: "externalInstanceId",
      header: "Instância",
      render: (event) => (
        <span className="font-mono text-xs text-muted-foreground truncate max-w-[100px] block">
          {event.externalInstanceId}
        </span>
      ),
    },
    {
      key: "processingStatus",
      header: "Status",
      render: (event) => <ProcessingStatusBadge status={event.processingStatus} />,
    },
    {
      key: "actions",
      header: "Ações",
      render: (event) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEventId(event.id);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos de Webhook"
        description="Visualize e gerencie eventos recebidos do WhatsApp"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReclassifyAll}
              disabled={reclassifyMutation.isPending}
            >
              <RotateCw className={cn("mr-2 h-4 w-4", reclassifyMutation.isPending && "animate-spin")} />
              Reclassificar Tudo
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        }
      />

      {/* Info banner */}
      <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        Os eventos são retidos por 12 horas e limpos automaticamente
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Hoje"
          value={stats?.today || 0}
          icon={Radio}
        />
        <MetricCard
          title="Pendentes"
          value={stats?.pending || 0}
          icon={Radio}
        />
        <MetricCard
          title="Com Erro"
          value={stats?.failed || 0}
          icon={Radio}
        />
        <MetricCard
          title="Processados"
          value={stats?.processed || 0}
          icon={Radio}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes
            {stats?.pending ? (
              <Badge variant="secondary" className="ml-2">
                {stats.pending}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="identified">Identificados</TabsTrigger>
          <TabsTrigger value="processed">Processados</TabsTrigger>
          <TabsTrigger value="failed">
            Com Erro
            {stats?.failed ? (
              <Badge variant="destructive" className="ml-2">
                {stats.failed}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por chat, telefone, message_id..."
                className="pl-10"
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            
            <Select
              value={filters.eventType || "all"}
              onValueChange={(v) => setFilters({ ...filters, eventType: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={filters.instanceId || "all"}
              onValueChange={(v) => setFilters({ ...filters, instanceId: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Instância" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Instâncias</SelectItem>
                {instances?.map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>
                    {instance.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={data?.events || []}
            keyExtractor={(event) => event.id}
            onRowClick={(event) => setSelectedEventId(event.id)}
            isLoading={isLoading}
            emptyMessage="Nenhum evento encontrado"
          />

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Página {page} de {data.totalPages} ({data.total} eventos)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEventId && !!selectedEvent && !showClassifyDialog} onOpenChange={(open) => {
        if (!open) {
          setSelectedEventId(null);
          setIsEditingEventType(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
            <DialogDescription>
              ID: {selectedEvent?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                {/* General Info */}
                <div>
                  <h4 className="font-medium mb-3">Informações Gerais</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <div className="mt-1 flex items-center gap-2">
                        {isEditingEventType ? (
                          <div className="flex items-center gap-2">
                            <Select value={editedEventType} onValueChange={setEditedEventType}>
                              <SelectTrigger className="w-[180px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {EVENT_TYPES.filter((t) => t !== "unknown").map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type.replace(/_/g, " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={handleSaveEventType}
                              disabled={classifyMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setIsEditingEventType(false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <EventTypeBadge eventType={selectedEvent.eventType} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditedEventType(selectedEvent.eventType);
                                setIsEditingEventType(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Classificação:</span>
                      <p className="font-medium capitalize">{selectedEvent.classification}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Direção:</span>
                      <p className="font-medium capitalize">{selectedEvent.direction || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confiança:</span>
                      <div className="mt-1">
                        <Badge variant="outline" className={
                          selectedEvent.confidence === "high" ? "bg-green-500/10 text-green-600 border-green-200" :
                          selectedEvent.confidence === "medium" ? "bg-yellow-500/10 text-yellow-600 border-yellow-200" :
                          "bg-gray-500/10 text-gray-600 border-gray-200"
                        }>
                          {selectedEvent.confidence || "low"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Regra:</span>
                      <p className="font-mono text-xs">{selectedEvent.matchedRule || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Origem:</span>
                      <p className="font-medium">{selectedEvent.source}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Instância:</span>
                      <p className="font-mono text-xs">{selectedEvent.externalInstanceId}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Context */}
                <div>
                  <h4 className="font-medium mb-3">Contexto</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Chat JID:</span>
                      <p className="font-mono text-xs break-all">{selectedEvent.chatJid || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo de Chat:</span>
                      <p className="font-medium capitalize">{selectedEvent.chatType || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nome do Chat:</span>
                      <p className="font-medium">{selectedEvent.chatName || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Remetente:</span>
                      <p className="font-medium">
                        {selectedEvent.senderName || selectedEvent.senderPhone || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Message ID:</span>
                      <p className="font-mono text-xs break-all">{selectedEvent.messageId || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data do Evento:</span>
                      <p className="font-medium">
                        {selectedEvent.eventTimestamp
                          ? format(new Date(selectedEvent.eventTimestamp), "dd/MM/yyyy HH:mm:ss")
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Processing Status */}
                <div>
                  <h4 className="font-medium mb-3">Status de Processamento</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="mt-1">
                        <ProcessingStatusBadge status={selectedEvent.processingStatus} />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Processado em:</span>
                      <p className="font-medium">
                        {selectedEvent.processedAt
                          ? format(new Date(selectedEvent.processedAt), "dd/MM/yyyy HH:mm:ss")
                          : "-"}
                      </p>
                    </div>
                    {selectedEvent.processingError && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Erro:</span>
                        <p className="text-sm text-destructive mt-1">{selectedEvent.processingError}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Raw Payload */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Payload Original</h4>
                    <Button variant="outline" size="sm" onClick={handleCopyPayload}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                  </div>
                  <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedEvent.rawEvent, null, 2)}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          )}
          
          {selectedEvent && (
            <div className="flex justify-end gap-2 mt-4">
              {selectedEvent.classification === "pending" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewEventType(selectedEvent.eventType);
                    setShowClassifyDialog(true);
                  }}
                >
                  Classificar
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => handleReprocess(selectedEvent)}
                disabled={reprocessMutation.isPending}
              >
                <RotateCw className={cn("mr-2 h-4 w-4", reprocessMutation.isPending && "animate-spin")} />
                Reclassificar
              </Button>
              <Button
                variant="outline"
                onClick={() => handleIgnore(selectedEvent)}
                disabled={ignoreMutation.isPending}
              >
                <Ban className="mr-2 h-4 w-4" />
                Ignorar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Classify Dialog */}
      <Dialog open={showClassifyDialog} onOpenChange={setShowClassifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Classificar Evento</DialogTitle>
            <DialogDescription>
              Este evento não foi identificado automaticamente. Selecione o tipo correto.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Select value={newEventType} onValueChange={setNewEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.filter((t) => t !== "unknown").map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowClassifyDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleClassify} disabled={!newEventType || classifyMutation.isPending}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
