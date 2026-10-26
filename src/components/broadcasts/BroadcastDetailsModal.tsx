import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BroadcastCampaign } from "@/types/broadcast.types";
import { useBroadcastDetails } from "@/hooks/useBroadcastCampaigns";
import {
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  RefreshCw,
  GitBranch,
  ShieldAlert,
  Play,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BroadcastDetailsModalProps {
  campaign: BroadcastCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDispatchBatch?: (broadcastId: string) => Promise<any>;
  isDispatching?: boolean;
}

export function BroadcastDetailsModal({
  campaign,
  open,
  onOpenChange,
  onDispatchBatch,
  isDispatching,
}: BroadcastDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("recipients");
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { recipients, isLoadingRecipients, refetchRecipients } = useBroadcastDetails(
    campaign?.id || null
  );

  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      const matchSearch =
        !searchFilter ||
        r.lead?.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.lead?.phone?.includes(searchFilter) ||
        r.lead?.email?.toLowerCase().includes(searchFilter.toLowerCase());

      const matchStatus = statusFilter === "all" || r.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [recipients, searchFilter, statusFilter]);

  // Group recipients by batch
  const batchesGrouped = useMemo(() => {
    const map = new Map<number, { batchIndex: number; date: string; total: number; sent: number; pending: number; failed: number }>();
    recipients.forEach((r) => {
      if (!map.has(r.batch_index)) {
        map.set(r.batch_index, {
          batchIndex: r.batch_index,
          date: r.scheduled_date,
          total: 0,
          sent: 0,
          pending: 0,
          failed: 0,
        });
      }
      const entry = map.get(r.batch_index)!;
      entry.total++;
      if (r.status === "sent") entry.sent++;
      else if (r.status === "failed") entry.failed++;
      else entry.pending++;
    });
    return Array.from(map.values()).sort((a, b) => a.batchIndex - b.batchIndex);
  }, [recipients]);

  if (!campaign) return null;

  const total = campaign.total_leads || 0;
  const sent = campaign.sent_count || 0;
  const failed = campaign.failed_count || 0;
  const pending = Math.max(0, total - (sent + failed));
  const progressPercent = total > 0 ? Math.round((sent / total) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">Em Execução</Badge>;
      case "scheduled":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">Agendado</Badge>;
      case "completed":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">Concluído</Badge>;
      case "paused":
        return <Badge className="bg-muted text-muted-foreground">Pausado</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRecipientStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3" /> Enviado
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 gap-1 text-[11px]">
            <AlertCircle className="w-3 h-3" /> Falhou
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px]">
            <Clock className="w-3 h-3" /> Na Fila
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold">{campaign.name}</DialogTitle>
                {getStatusBadge(campaign.status)}
              </div>
              <DialogDescription className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-primary" />
                  Fluxo: <strong>{campaign.workflow?.name || "Fluxo Geral"}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {campaign.total_leads} leads na audiência
                </span>
                {campaign.estimated_completion_at && (
                  <>
                    <span>•</span>
                    <span className="text-primary font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Previsão de término:{" "}
                      {format(new Date(campaign.estimated_completion_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>

            {/* Batch execution button if pending exists */}
            {pending > 0 && campaign.status !== "cancelled" && onDispatchBatch && (
              <Button
                size="sm"
                onClick={() => onDispatchBatch(campaign.id)}
                disabled={isDispatching}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0"
              >
                {isDispatching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                Executar Próximo Lote Agora
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Progress bar card */}
        <div className="bg-muted/40 p-4 rounded-xl border border-border/50 my-2 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-foreground">Progresso do Disparo</span>
            <span className="font-semibold text-primary">{progressPercent}% Concluído</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
            <div className="p-2 rounded bg-card/60 border border-border/40">
              <span className="text-muted-foreground block text-[11px]">Total Leads</span>
              <strong className="text-sm font-semibold">{total}</strong>
            </div>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <span className="block text-[11px]">Enviados</span>
              <strong className="text-sm font-semibold">{sent}</strong>
            </div>
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <span className="block text-[11px]">Pendentes</span>
              <strong className="text-sm font-semibold">{pending}</strong>
            </div>
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <span className="block text-[11px]">Falhas</span>
              <strong className="text-sm font-semibold">{failed}</strong>
            </div>
          </div>
        </div>

        {/* Tabs for details */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="recipients" className="text-xs">
                Destinatários ({recipients.length})
              </TabsTrigger>
              <TabsTrigger value="batches" className="text-xs">
                Cronograma de Lotes ({batchesGrouped.length})
              </TabsTrigger>
              <TabsTrigger value="cadence" className="text-xs">
                Configuração & Cadência
              </TabsTrigger>
            </TabsList>

            {activeTab === "recipients" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchRecipients()}
                className="h-8 text-xs text-muted-foreground gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar Lista
              </Button>
            )}
          </div>

          {/* TAB 1: RECIPIENTS */}
          <TabsContent value="recipients" className="flex-1 flex flex-col min-h-0 pt-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar destinatário por nome, telefone ou e-mail..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                {["all", "pending", "sent", "failed"].map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={statusFilter === st ? "secondary" : "ghost"}
                    onClick={() => setStatusFilter(st)}
                    className="h-8 text-xs capitalize"
                  >
                    {st === "all" ? "Todos" : st === "pending" ? "Na Fila" : st === "sent" ? "Enviados" : "Falhas"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-border/40 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs py-2">Destinatário</TableHead>
                    <TableHead className="text-xs py-2">Telefone</TableHead>
                    <TableHead className="text-xs py-2">Lote / Data Prevista</TableHead>
                    <TableHead className="text-xs py-2">Status</TableHead>
                    <TableHead className="text-xs py-2">Disparado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRecipients ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Carregando destinatários...
                      </TableCell>
                    </TableRow>
                  ) : filteredRecipients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum destinatário encontrado com os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecipients.map((rec) => (
                      <TableRow key={rec.id} className="text-xs hover:bg-muted/20">
                        <TableCell className="font-medium py-2">
                          <div>
                            <span>{rec.lead?.name || "Lead sem nome"}</span>
                            {rec.lead?.email && (
                              <span className="block text-[11px] text-muted-foreground">{rec.lead.email}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-muted-foreground font-mono">
                          {rec.lead?.phone || "—"}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[11px] font-normal">
                            Lote {rec.batch_index} ({rec.scheduled_date})
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          {getRecipientStatusBadge(rec.status)}
                          {rec.error_message && (
                            <span className="block text-[10px] text-rose-500 truncate max-w-[200px]" title={rec.error_message}>
                              {rec.error_message}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-muted-foreground">
                          {rec.dispatched_at
                            ? format(new Date(rec.dispatched_at), "dd/MM/yyyy HH:mm")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 2: CRONOGRAMA DE LOTES */}
          <TabsContent value="batches" className="flex-1 overflow-auto pt-2 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {batchesGrouped.map((b) => (
                <div
                  key={b.batchIndex}
                  className="p-3.5 rounded-lg border border-border/60 bg-card/40 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Lote #{b.batchIndex}</span>
                      <Badge variant="outline" className="text-[11px]">
                        <Calendar className="w-3 h-3 mr-1 text-primary" /> {b.date}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {b.total} leads previstos para envio
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {b.sent > 0 && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px]">
                        {b.sent} enviados
                      </Badge>
                    )}
                    {b.pending > 0 && (
                      <Badge variant="outline" className="text-muted-foreground text-[11px]">
                        {b.pending} pendentes
                      </Badge>
                    )}
                    {b.failed > 0 && (
                      <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[11px]">
                        {b.failed} falhas
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: CONFIGURAÇÃO & CADÊNCIA */}
          <TabsContent value="cadence" className="flex-1 overflow-auto pt-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Regras de Cadência & Proteção
                </h4>
                <div className="space-y-2 text-muted-foreground">
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>Modo de Distribuição:</span>
                    <strong className="text-foreground capitalize">
                      {campaign.distribution_mode === "immediate"
                        ? "Disparo Imediato"
                        : "Lotes Diários (Anti-Ban)"}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>Limite Diário de Disparos:</span>
                    <strong className="text-foreground">{campaign.daily_limit} contatos/dia</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>Janela de Envio:</span>
                    <strong className="text-foreground">
                      Das {campaign.send_time_start} às {campaign.send_time_end}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Dias permitidos:</span>
                    <strong className="text-foreground">
                      {campaign.workdays_only ? "Apenas dias úteis (Seg - Sex)" : "Todos os dias"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                  <GitBranch className="w-4 h-4 text-primary" />
                  Ação Executada
                </h4>
                <div className="space-y-2 text-muted-foreground">
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>Fluxo Selecionado:</span>
                    <strong className="text-foreground">{campaign.workflow?.name || "Fluxo Padrão"}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>Instância do WhatsApp:</span>
                    <strong className="text-foreground">
                      {campaign.instance?.name || "Conexão Ativa / Padrão"}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>Data de Criação:</span>
                    <strong className="text-foreground">
                      {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm")}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Previsão de Término:</span>
                    <strong className="text-primary font-semibold">
                      {campaign.estimated_completion_at
                        ? format(new Date(campaign.estimated_completion_at), "dd/MM/yyyy 'às' HH:mm")
                        : "Não calculada"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
