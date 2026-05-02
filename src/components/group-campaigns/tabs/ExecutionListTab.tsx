import { useState, useEffect, useMemo } from "react";
import { useGroupExecutionList, GroupExecutionList, GroupExecutionLead } from "@/hooks/useGroupExecutionList";
import { useGroupMembers, GroupMember } from "@/hooks/useGroupMembers";
import { ExecutionListConfigDialog } from "../dialogs/ExecutionListConfigDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Clock, Zap, Users, Pencil, Play, Webhook, MessageSquare, Phone, ArrowLeft, Plus, Trash2, RefreshCw, Infinity, RotateCw, Eye, Copy, UserCheck, UserX, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ExecutionListTabProps {
  campaignId: string;
}

const EVENT_LABELS: Record<string, string> = {
  group_join: "group_join",
  message: "message",
  poll_response: "poll_response",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  webhook: <Webhook className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
};

const ACTION_LABELS: Record<string, string> = {
  webhook: "Webhook",
  message: "Mensagem",
  call: "Ligação",
};

function isFulltime(list: GroupExecutionList): boolean {
  return list.window_type === "fixed" && list.window_start_time?.slice(0, 5) === "00:00" && list.window_end_time?.slice(0, 5) === "23:59";
}

// Filter out technical sender labels (e.g. WhatsApp event types) used as names
const INVALID_NAMES = new Set(["invite", "add", "remove", "leave", "promote", "demote"]);
const displayName = (name?: string | null): string | null => {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed || INVALID_NAMES.has(trimmed.toLowerCase())) return null;
  return trimmed;
};

// ── Detail view for a single list ──
function ExecutionListDetail({
  list,
  campaignId,
  onBack,
  onEdit,
}: {
  list: GroupExecutionList;
  campaignId: string;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { useListLeads, toggleActive, executeNow, executeLeads } = useGroupExecutionList(campaignId);
  const fulltime = isFulltime(list);
  const { data: leads = [], isLoading: leadsLoading } = useListLeads(list.id, list.current_cycle_id, fulltime);
  const { members } = useGroupMembers(campaignId);

  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);
  const [showReexecConfirm, setShowReexecConfirm] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [viewingLead, setViewingLead] = useState<GroupExecutionLead | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [countdown, setCountdown] = useState("");
  const [windowExpired, setWindowExpired] = useState(false);

  useEffect(() => {
    if (!list.current_window_end || !list.is_active) {
      setCountdown("");
      setWindowExpired(false);
      return;
    }
    const update = () => {
      const diff = new Date(list.current_window_end!).getTime() - Date.now();
      if (diff <= 0) {
        setWindowExpired(true);
        if (list.window_type === "fixed" && list.window_start_time) {
          setCountdown(`Reabre às ${list.window_start_time.slice(0, 5)}`);
        } else if (list.window_type === "duration" && list.window_duration_hours) {
          setCountdown(`Próximo ciclo: ${list.window_duration_hours}h`);
        } else {
          setCountdown("Aguardando próximo ciclo");
        }
        return;
      }
      setWindowExpired(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${h}h ${m}min`);
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [list.current_window_end, list.is_active, list.window_type, list.window_start_time, list.window_duration_hours]);

  const pendingLeads = useMemo(() => leads.filter((l) => l.status === "pending"), [leads]);

  const totalPages = Math.max(1, Math.ceil(leads.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, leads.length);
  const paginatedLeads = leads.slice(startIndex, endIndex);

  // Reset to a valid page if current page becomes invalid (e.g., new leads arrive via realtime)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const visiblePages = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("ellipsis");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("ellipsis");
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  const handleToggle = async (active: boolean) => {
    try {
      await toggleActive.mutateAsync({ id: list.id, is_active: active, list });
      toast.success(active ? "Lista ativada" : "Lista pausada");
    } catch { toast.error("Erro ao alterar status"); }
  };

  const handleExecuteNow = async () => {
    try {
      await executeNow.mutateAsync(list.id);
      toast.success("Execução concluída");
      setShowExecuteConfirm(false);
    } catch { toast.error("Erro ao executar lista"); }
  };

  const handleReexecuteSelected = async () => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    try {
      const result: any = await executeLeads.mutateAsync({ listId: list.id, leadIds: ids });
      const ok = result?.processed ?? ids.length;
      const fail = result?.errors ?? 0;
      if (fail > 0) {
        toast.warning(`Re-execução: ${ok} ok, ${fail} falhas`);
      } else {
        toast.success(`${ok} lead(s) reprocessado(s)`);
      }
      setSelectedLeadIds(new Set());
      setShowReexecConfirm(false);
    } catch { toast.error("Erro ao reprocessar leads"); }
  };

  // Toggle individual lead selection
  const toggleLead = (id: string, checked: boolean) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Toggle select-all on current page
  const pageIds = paginatedLeads.map((l) => l.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedLeadIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedLeadIds.has(id));
  const togglePageAll = (checked: boolean) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (checked) pageIds.forEach((id) => next.add(id));
      else pageIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const windowLabel =
    list.window_type === "fixed"
      ? `${list.window_start_time?.slice(0, 5) || "?"} → ${list.window_end_time?.slice(0, 5) || "?"} (fixo)`
      : `${list.window_duration_hours}h (duração)`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h3 className="text-lg font-semibold">{list.name}</h3>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
          <Switch checked={list.is_active} onCheckedChange={handleToggle} />
        </div>
      </div>

      <div className={`grid grid-cols-2 ${fulltime ? "md:grid-cols-3" : "md:grid-cols-4"} gap-3`}>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Users className="h-4 w-4" />{fulltime ? "Total de leads (24h)" : "Leads no ciclo"}</div>
          <div className="text-2xl font-bold">{fulltime ? leads.length : pendingLeads.length}</div>
        </CardContent></Card>
        {!fulltime && (
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              {windowExpired ? <RefreshCw className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {windowExpired ? "Próxima janela" : "Janela fecha em"}
            </div>
            <div className={`text-2xl font-bold ${windowExpired ? "text-muted-foreground" : ""}`}>{countdown || "—"}</div>
          </CardContent></Card>
        )}
        <Card><CardContent className="p-4">
          {fulltime ? (
            <>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Infinity className="h-4 w-4" />Modo</div>
              <div className="text-sm font-medium">Cumulativo (24h)</div>
            </>
          ) : (
            <>
              <div className="text-muted-foreground text-sm mb-1">Janela</div>
              <div className="text-sm font-medium">{windowLabel}</div>
            </>
          )}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-muted-foreground text-sm mb-1">Ação configurada</div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {ACTION_ICONS[list.action_type]}{ACTION_LABELS[list.action_type]}
          </div>
        </CardContent></Card>
      </div>

      <div>
        <span className="text-sm text-muted-foreground mr-2">Eventos monitorados:</span>
        {list.monitored_events.map((e) => (
          <Badge key={e} variant="secondary" className="mr-1">{EVENT_LABELS[e] || e}</Badge>
        ))}
      </div>

      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <span className="text-sm font-semibold">{fulltime ? "Histórico das últimas 24h" : "Leads do ciclo atual"}</span>
          <div className="flex items-center gap-2">
            {selectedLeadIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowReexecConfirm(true)} disabled={executeLeads.isPending}>
                <RotateCw className="h-4 w-4 mr-1" />
                {executeLeads.isPending ? "Reprocessando..." : `Executar Selecionados (${selectedLeadIds.size})`}
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => setShowExecuteConfirm(true)} disabled={pendingLeads.length === 0 || executeNow.isPending}>
              <Play className="h-4 w-4 mr-1" />{executeNow.isPending ? "Executando..." : "Executar Agora"}
            </Button>
          </div>
        </div>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{fulltime ? "Nenhum lead processado nas últimas 24h." : "Nenhum lead capturado neste ciclo ainda."}</p>
        ) : (
          <>
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => togglePageAll(v === true)}
                    aria-label="Selecionar todos da página"
                  />
                </TableHead>
                <TableHead>Nome / Número</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>{fulltime ? "Capturado em" : "Entrou às"}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 text-right">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {paginatedLeads.map((lead) => (
                  <TableRow key={lead.id} data-state={selectedLeadIds.has(lead.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeadIds.has(lead.id)}
                        onCheckedChange={(v) => toggleLead(lead.id, v === true)}
                        aria-label={`Selecionar ${displayName(lead.name) || lead.phone}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {displayName(lead.name) || lead.phone}
                      {displayName(lead.name) && <span className="text-xs text-muted-foreground ml-1">{lead.phone}</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{lead.origin_event}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(lead.created_at), fulltime ? "dd/MM HH:mm" : "HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={lead.status === "executed" ? "default" : lead.status === "failed" ? "destructive" : "secondary"}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewingLead(lead)}
                        aria-label="Ver detalhes do evento"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {leads.length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Itens por página:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[25, 50, 100].map((opt) => (
                        <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">
                    Exibindo {startIndex + 1}-{endIndex} de {leads.length}
                  </span>
                </div>
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={safePage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {visiblePages.map((page, idx) =>
                      page === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={safePage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={safePage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent></Card>

      <AlertDialog open={showExecuteConfirm} onOpenChange={setShowExecuteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Executar Lista Agora</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá disparar a ação para os {pendingLeads.length} leads do ciclo atual imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecuteNow} disabled={executeNow.isPending}>
              {executeNow.isPending ? "Executando..." : "Confirmar Execução"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReexecConfirm} onOpenChange={setShowReexecConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprocessar Leads Selecionados</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá disparar novamente a ação configurada ({ACTION_LABELS[list.action_type]}) para os {selectedLeadIds.size} lead(s) selecionado(s), independente do status atual. Não afeta o ciclo da lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReexecuteSelected} disabled={executeLeads.isPending}>
              {executeLeads.isPending ? "Reprocessando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LeadEventDialog
        lead={viewingLead}
        list={list}
        members={members}
        onClose={() => setViewingLead(null)}
        onReexecute={async (leadId) => {
          try {
            await executeLeads.mutateAsync({ listId: list.id, leadIds: [leadId] });
            toast.success("Lead reprocessado");
          } catch { toast.error("Erro ao reprocessar lead"); }
        }}
        isReexecuting={executeLeads.isPending}
      />
    </div>
  );
}

// ── Lead event detail dialog ──
function LeadEventDialog({
  lead,
  list,
  members,
  onClose,
  onReexecute,
  isReexecuting,
}: {
  lead: GroupExecutionLead | null;
  list: GroupExecutionList;
  members: GroupMember[];
  onClose: () => void;
  onReexecute: (leadId: string) => Promise<void>;
  isReexecuting: boolean;
}) {
  // Match member by LID first (precise), fallback to phone
  const matchedMember = useMemo(() => {
    if (!lead) return null;
    if (lead.lid) {
      const byLid = members.find((m) => m.lid && m.lid === lead.lid);
      if (byLid) return byLid;
    }
    if (lead.phone) {
      const normalized = lead.phone.replace(/\D/g, "");
      return members.find((m) => m.phone && m.phone.replace(/\D/g, "") === normalized) || null;
    }
    return null;
  }, [lead, members]);

  // Try to parse origin_detail as JSON for pretty formatting
  const formattedDetail = useMemo(() => {
    if (!lead?.origin_detail) return null;
    try {
      return JSON.stringify(JSON.parse(lead.origin_detail), null, 2);
    } catch {
      return lead.origin_detail;
    }
  }, [lead?.origin_detail]);

  if (!lead) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const actionTarget =
    list.action_type === "webhook"
      ? list.webhook_url || "—"
      : list.action_type === "message"
        ? list.message_template?.slice(0, 80) + (list.message_template && list.message_template.length > 80 ? "..." : "") || "—"
        : list.action_type === "call"
          ? `Campanha: ${list.call_campaign_id || "—"}`
          : "—";

  return (
    <Dialog open={!!lead} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Evento</DialogTitle>
          <DialogDescription>Informações sobre o lead capturado e a ação disparada.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lead capturado */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lead capturado</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Nome</div>
                <div className="font-medium">{displayName(lead.name) || <span className="text-muted-foreground italic">sem nome</span>}</div>
              </div>
              {(() => {
                // Detect if "phone" stored is actually a LID (15+ digits, no country prefix)
                const phoneDigits = (lead.phone || "").replace(/\D/g, "");
                const phoneIsLid = phoneDigits.length >= 14 && !phoneDigits.startsWith("55") && !phoneDigits.startsWith("1");
                return (
                  <div>
                    <div className="text-xs text-muted-foreground">{phoneIsLid ? "Identificador (LID)" : "Telefone"}</div>
                    <div className="font-mono text-sm flex items-center gap-1">
                      {lead.phone}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(lead.phone, phoneIsLid ? "LID" : "Telefone")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })()}
              {lead.lid && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">LID</div>
                  <div className="font-mono text-xs flex items-center gap-1 break-all">
                    {lead.lid}
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(lead.lid!, "LID")}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge variant={lead.status === "executed" ? "default" : lead.status === "failed" ? "destructive" : "secondary"}>
                  {lead.status}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Capturado em</div>
                <div className="text-sm">{format(new Date(lead.created_at), "dd/MM/yyyy HH:mm:ss")}</div>
              </div>
              {lead.executed_at && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Executado em</div>
                  <div className="text-sm">{format(new Date(lead.executed_at), "dd/MM/yyyy HH:mm:ss")}</div>
                </div>
              )}
            </div>
          </div>

          {/* Membro vinculado */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              {matchedMember ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
              Membro vinculado
            </div>
            {matchedMember ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {matchedMember.profilePhoto && <AvatarImage src={matchedMember.profilePhoto} alt={matchedMember.name || matchedMember.phone} />}
                  <AvatarFallback>{(matchedMember.name || matchedMember.phone).slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{matchedMember.name || "Sem nome"}</span>
                    {matchedMember.isAdmin && <Badge variant="outline" className="text-xs">Admin</Badge>}
                    <Badge variant={matchedMember.status === "active" ? "default" : "secondary"} className="text-xs">
                      {matchedMember.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{matchedMember.phone}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(matchedMember.phone, "Telefone do membro")}
                  title="Copiar telefone real para buscar na aba Membros"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar telefone
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Membro não encontrado nesta campanha. {lead.lid ? "O LID não corresponde a nenhum membro sincronizado — tente listar os membros novamente." : "Tente buscar pelo telefone ou LID na aba Membros."}
              </p>
            )}
          </div>

          {/* Origem do evento */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Origem</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Evento:</span>
              <Badge variant="outline">{lead.origin_event || "—"}</Badge>
            </div>
            {formattedDetail && (
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                {formattedDetail}
              </pre>
            )}
          </div>

          {/* Ação configurada */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ação configurada na lista</div>
            <div className="flex items-center gap-2 text-sm">
              {ACTION_ICONS[list.action_type]}
              <span className="font-medium">{ACTION_LABELS[list.action_type]}</span>
            </div>
            <div className="text-xs text-muted-foreground font-mono break-all">{actionTarget}</div>
          </div>

          {/* Erro */}
          {lead.status === "failed" && lead.error_message && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 space-y-1">
              <div className="text-xs font-semibold text-destructive uppercase tracking-wide flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Erro
              </div>
              <pre className="text-xs text-destructive whitespace-pre-wrap break-all">{lead.error_message}</pre>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button
            onClick={() => onReexecute(lead.id)}
            disabled={isReexecuting}
          >
            <RotateCw className="h-4 w-4 mr-1" />
            {isReexecuting ? "Reprocessando..." : "Re-executar este lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main tab component ──
export function ExecutionListTab({ campaignId }: ExecutionListTabProps) {
  const { lists, isLoading, createList, updateList, deleteList } = useGroupExecutionList(campaignId);

  const [selectedList, setSelectedList] = useState<GroupExecutionList | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [editingList, setEditingList] = useState<GroupExecutionList | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync selectedList with fresh data
  useEffect(() => {
    if (selectedList) {
      const fresh = lists.find((l) => l.id === selectedList.id);
      if (fresh) setSelectedList(fresh);
      else setSelectedList(null);
    }
  }, [lists]);

  const handleSave = async (config: Parameters<typeof createList.mutateAsync>[0]) => {
    try {
      if (editingList) {
        await updateList.mutateAsync({ id: editingList.id, config });
        toast.success("Lista atualizada");
      } else {
        await createList.mutateAsync(config);
        toast.success("Lista criada");
      }
      setShowConfig(false);
      setEditingList(null);
    } catch { toast.error("Erro ao salvar lista"); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteList.mutateAsync(deletingId);
      toast.success("Lista removida");
      setDeletingId(null);
    } catch { toast.error("Erro ao remover lista"); }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Carregando...</div>;
  }

  // Detail view
  if (selectedList) {
    return (
      <>
        <ExecutionListDetail
          list={selectedList}
          campaignId={campaignId}
          onBack={() => setSelectedList(null)}
          onEdit={() => { setEditingList(selectedList); setShowConfig(true); }}
        />
        <ExecutionListConfigDialog
          open={showConfig}
          onOpenChange={(v) => { setShowConfig(v); if (!v) setEditingList(null); }}
          onSave={handleSave}
          existing={editingList}
          isSaving={updateList.isPending}
        />
      </>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Listas de Execução</h3>
        <Button size="sm" onClick={() => { setEditingList(null); setShowConfig(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Lista
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma lista configurada</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Crie listas para capturar leads de diferentes eventos — entradas, enquetes, saídas — cada uma com sua própria janela e ação.
            </p>
            <Button onClick={() => setShowConfig(true)}>+ Nova Lista</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedList(list)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{list.name}</span>
                      <Badge variant={list.is_active ? "default" : "secondary"}>
                        {list.is_active ? "Ativo" : "Pausado"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {ACTION_ICONS[list.action_type]}
                      <span>{ACTION_LABELS[list.action_type]}</span>
                      <span>·</span>
                      <span>
                        {isFulltime(list)
                          ? "24h · Cumulativo"
                          : list.window_type === "fixed"
                            ? `${list.window_start_time?.slice(0, 5) || "?"} → ${list.window_end_time?.slice(0, 5) || "?"}`
                            : `${list.window_duration_hours}h`}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeletingId(list.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {list.monitored_events.map((e) => (
                    <Badge key={e} variant="outline" className="text-xs">{EVENT_LABELS[e] || e}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExecutionListConfigDialog
        open={showConfig}
        onOpenChange={(v) => { setShowConfig(v); if (!v) setEditingList(null); }}
        onSave={handleSave}
        existing={editingList}
        isSaving={createList.isPending || updateList.isPending}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Lista</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os leads do ciclo atual serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteList.isPending}>
              {deleteList.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
