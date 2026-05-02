import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCallLeads, CallLeadStatus } from "@/hooks/useCallLeads";
import { useCallActions, CallActionType } from "@/hooks/useCallActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, UserPlus, Clock, CheckCircle, XCircle, Phone, Eye, PhoneCall, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/dispatch";
import { QueueControlPanel } from "../QueueControlPanel";
import { format } from "date-fns";
import type { CallLead } from "@/hooks/useCallLeads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface LeadsTabProps {
  campaignId: string;
  queueExecutionEnabled?: boolean;
}

const statusLabels: Record<CallLeadStatus, string> = {
  pending: "Pendente",
  calling: "Ligando",
  in_progress: "Em andamento",
  completed: "Concluído",
  no_answer: "Não atendeu",
  busy: "Ocupado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const statusColors: Record<CallLeadStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  calling: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  no_answer: "bg-orange-100 text-orange-800",
  busy: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const actionTypeLabels: Record<CallActionType, string> = {
  start_sequence: "Iniciar Sequência",
  add_tag: "Adicionar Tag",
  update_status: "Atualizar Status",
  webhook: "Webhook",
  none: "Nenhuma Ação",
  custom_message: "Mensagem Personalizada",
};

export function LeadsTab({ campaignId, queueExecutionEnabled = false }: LeadsTabProps) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<CallLeadStatus | undefined>();
  const { leads, stats, isLoading, addLead, deleteLead, bulkDeleteAll, isDeletingAll, bulkEnqueueByStatus, isBulkEnqueuing, isAdding } = useCallLeads(
    campaignId,
    statusFilter
  );
  const { actions } = useCallActions(campaignId);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showRemoveAllConfirm, setShowRemoveAllConfirm] = useState(false);
  const [newLead, setNewLead] = useState({ phone: "", name: "", email: "" });
  const [selectedLead, setSelectedLead] = useState<CallLead | null>(null);

  const [bulkLimit, setBulkLimit] = useState<string>("");

  const bulkDialStatus = statusFilter || "pending";
  const bulkDialLabel = statusLabels[bulkDialStatus];
  const leadsCountForBulk = statusFilter ? leads.length : stats.pending;
  const parsedLimit = bulkLimit ? parseInt(bulkLimit) : undefined;
  const effectiveCount = parsedLimit ? Math.min(parsedLimit, leadsCountForBulk) : leadsCountForBulk;
  const bulkButtonText = parsedLimit
    ? `Discar ${effectiveCount} ${bulkDialLabel.toLowerCase()}`
    : `Discar todos ${bulkDialLabel.toLowerCase()}`;

  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleAddLead = async () => {
    if (!newLead.phone.trim()) return;
    await addLead({
      phone: newLead.phone.trim(),
      name: newLead.name.trim() || undefined,
      email: newLead.email.trim() || undefined,
    });
    setNewLead({ phone: "", name: "", email: "" });
    setShowAddDialog(false);
  };

  const handleSyncFromBase = async () => {
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Pega todos os leads da base ligados a esta campanha (paginado)
      const baseLeads: { phone: string; name: string | null; email: string | null }[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("leads")
          .select("phone, name, email")
          .eq("active_campaign_id", campaignId)
          .eq("user_id", user.id)
          .not("phone", "is", null)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        baseLeads.push(...data.filter(l => l.phone) as { phone: string; name: string | null; email: string | null }[]);
        if (data.length < PAGE) break;
        from += PAGE;
      }

      // Pega telefones já existentes em call_leads
      const existing = new Set<string>();
      let efrom = 0;
      while (true) {
        const { data, error } = await supabase
          .from("call_leads")
          .select("phone")
          .eq("campaign_id", campaignId)
          .range(efrom, efrom + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        data.forEach(d => existing.add(d.phone));
        if (data.length < PAGE) break;
        efrom += PAGE;
      }

      const missing = baseLeads.filter(l => !existing.has(l.phone));
      if (missing.length === 0) {
        toast.info("Nenhum lead pendente para sincronizar");
        return;
      }

      // Insere em batches pequenos com checagem de erro
      const BATCH = 50;
      let synced = 0;
      let failed = 0;
      for (let i = 0; i < missing.length; i += BATCH) {
        const batch = missing.slice(i, i + BATCH);
        const rows = batch.map(l => ({
          campaign_id: campaignId,
          user_id: user.id,
          phone: l.phone,
          name: l.name,
          email: l.email,
          status: "pending",
        }));
        const { error } = await (supabase as any).from("call_leads").upsert(rows, { onConflict: "phone,campaign_id" });
        if (error) {
          // Fallback row-by-row
          for (const row of rows) {
            const { error: rowError } = await (supabase as any).from("call_leads").upsert([row], { onConflict: "phone,campaign_id" });
            if (rowError) failed++; else synced++;
          }
        } else {
          synced += batch.length;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["call_leads"] });
      queryClient.invalidateQueries({ queryKey: ["call-leads"] });

      if (failed > 0) {
        toast.warning(`Sincronizados ${synced} leads. ${failed} falharam.`);
      } else {
        toast.success(`Sincronizados ${synced} leads da base para a fila`);
      }
    } catch (err) {
      toast.error("Erro ao sincronizar: " + (err as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Control Panel */}
      {queueExecutionEnabled && (
        <QueueControlPanel campaignId={campaignId} />
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total" value={stats.total} icon={UserPlus} />
        <MetricCard title="Pendentes" value={stats.pending} icon={Clock} />
        <MetricCard title="Concluídos" value={stats.completed} icon={CheckCircle} />
        <MetricCard title="Falhas" value={stats.failed} icon={XCircle} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? undefined : (v as CallLeadStatus))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          {queueExecutionEnabled && leadsCountForBulk > 0 && (
            <>
              <Input
                type="number"
                min={1}
                max={leadsCountForBulk}
                placeholder="Qtd"
                value={bulkLimit}
                onChange={(e) => setBulkLimit(e.target.value)}
                className="w-[80px]"
              />
              <Button
                variant="outline"
                onClick={() => setShowBulkConfirm(true)}
                disabled={isBulkEnqueuing}
              >
                <PhoneCall className="mr-2 h-4 w-4" />
                {isBulkEnqueuing ? "Enfileirando..." : bulkButtonText}
              </Button>
            </>
          )}
          {stats.total > 0 && (
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowRemoveAllConfirm(true)}
              disabled={isDeletingAll}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeletingAll ? "Removendo..." : "Remover Todos"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleSyncFromBase}
            disabled={isSyncing}
            title="Adiciona à fila os leads desta campanha que estão na base mas não aparecem aqui"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar leads da base"}
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Lead
          </Button>
        </div>
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Phone className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum lead cadastrado</h3>
          <p className="text-muted-foreground mb-4">
            Adicione leads para iniciar as ligações desta campanha.
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Lead
          </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leads ({leads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(lead.createdAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>{lead.name || "-"}</TableCell>
                    <TableCell className="font-medium">{lead.phone}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[lead.status]}>
                        {statusLabels[lead.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedLead(lead)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteLead(lead.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                placeholder="Ex: 5511999999999"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadName">Nome (opcional)</Label>
              <Input
                id="leadName"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                placeholder="Ex: joao@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddLead} disabled={!newLead.phone.trim() || isAdding}>
              {isAdding ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Nome</Label>
                  <p className="font-medium">{selectedLead.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Telefone</Label>
                  <p className="font-medium">{selectedLead.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">E-mail</Label>
                  <p className="font-medium">{selectedLead.email || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">
                    <Badge className={statusColors[selectedLead.status]}>
                      {statusLabels[selectedLead.status]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Criação</Label>
                  <p className="font-medium">{format(new Date(selectedLead.createdAt), "dd/MM/yyyy HH:mm")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Última Tentativa</Label>
                  <p className="font-medium">
                    {selectedLead.lastAttemptAt
                      ? format(new Date(selectedLead.lastAttemptAt), "dd/MM/yyyy HH:mm")
                      : "-"}
                  </p>
                </div>
              </div>

              {selectedLead.resultActionId && (
                <div>
                  <Label className="text-muted-foreground text-xs">Resultado da Ligação</Label>
                  {(() => {
                    const resultAction = actions.find(a => a.id === selectedLead.resultActionId);
                    return resultAction ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: resultAction.color }} />
                        <span className="font-medium">{resultAction.name}</span>
                      </div>
                    ) : (
                      <p className="font-medium">Ação não encontrada</p>
                    );
                  })()}
                </div>
              )}

              {selectedLead.resultNotes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Notas</Label>
                  <p className="font-medium mt-1 p-2 bg-muted rounded text-sm">
                    {selectedLead.resultNotes}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground text-xs">Ações Configuradas na Campanha</Label>
                {actions.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">Nenhuma ação configurada</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {actions.map((action) => (
                      <div key={action.id} className="flex items-center gap-2 p-2 rounded border">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: action.color }} />
                        <span className="font-medium">{action.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {actionTypeLabels[action.actionType]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Dial Confirmation */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discar todos os leads</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enfileirar <strong>{effectiveCount}</strong> leads com status
              "<strong>{bulkDialLabel}</strong>" para discagem automática. A fila será iniciada imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await bulkEnqueueByStatus({ status: bulkDialStatus, limit: parsedLimit });
                setShowBulkConfirm(false);
                navigate("/painel-ligacoes?tab=queue");
              }}
            >
              Confirmar discagem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove All Confirmation */}
      <AlertDialog open={showRemoveAllConfirm} onOpenChange={setShowRemoveAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover todos os leads</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover todos os <strong>{stats.total}</strong> leads desta campanha? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await bulkDeleteAll();
                setShowRemoveAllConfirm(false);
              }}
            >
              Remover todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
