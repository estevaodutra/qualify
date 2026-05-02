import { useState, useRef, useEffect, useMemo } from "react";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { ExportWebhookDialog } from "@/components/group-campaigns/dialogs/ExportWebhookDialog";
import { ExecuteSequenceDialog } from "@/components/group-campaigns/dialogs/ExecuteSequenceDialog";
import { ExecuteListDialog } from "@/components/group-campaigns/dialogs/ExecuteListDialog";
import { AddToCampaignDialog, CampaignItem } from "@/components/leads/AddToCampaignDialog";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import { useInstances } from "@/hooks/useInstances";
import { buildGroupPayload } from "@/lib/webhook-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, MoreVertical, Upload, Download, UserMinus, Shield, AlertTriangle,
  Users, UserCheck, UserX, Loader2, RefreshCw, Send, UserPlus, Play, X, ListOrdered, FileText,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface MembersTabProps {
  campaignId: string;
}

export function MembersTab({ campaignId }: MembersTabProps) {
  const { members, stats, isLoading, addMember, addMembersBulk, removeMember, reactivateMember, isAdding } = useGroupMembers(campaignId);

  const { linkedGroups } = useCampaignGroups(campaignId);
  const { instances } = useInstances();
  const { campaigns: callCampaigns } = useCallCampaigns();
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [isFetchingMembers, setIsFetchingMembers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [showExportWebhookDialog, setShowExportWebhookDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New states
  const [periodFilter, setPeriodFilter] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExecuteSequenceDialog, setShowExecuteSequenceDialog] = useState(false);
  const [showExecuteListDialog, setShowExecuteListDialog] = useState(false);

  const availableCampaigns: CampaignItem[] = [
    ...(callCampaigns || []).map(c => ({ id: c.id, name: c.name, type: "ligacao", status: c.status })),
    ...(dispatchCampaigns || []).map(c => ({ id: c.id, name: c.name, type: "despacho", status: c.status })),
  ];

  // Filter by search + period (search matches name, phone, OR lid)
  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const termDigits = term.replace(/\D/g, "");
    let result = members.filter((m) => {
      if (!term) return true;
      const phoneMatch = m.phone?.toLowerCase().includes(term);
      const nameMatch = m.name?.toLowerCase().includes(term);
      // LID match: accept "128853498429553", "128853498429553@lid", or partial
      const lidNormalized = m.lid?.toLowerCase().replace(/@lid$/, "") || "";
      const lidMatch = !!m.lid && (
        m.lid.toLowerCase().includes(term) ||
        (termDigits.length > 0 && lidNormalized.includes(termDigits))
      );
      return phoneMatch || nameMatch || lidMatch;
    });

    if (periodFilter) {
      const threshold = subDays(new Date(), periodFilter);
      result = result.filter((m) => new Date(m.joinedAt) >= threshold);
    }

    return result;
  }, [members, searchTerm, periodFilter]);

  // Pagination
  const totalItems = filteredMembers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  // Selection helpers
  const selectedMembers = useMemo(
    () => filteredMembers.filter((m) => selectedIds.has(m.id)),
    [filteredMembers, selectedIds]
  );

  const allPageSelected = paginatedMembers.length > 0 && paginatedMembers.every((m) => selectedIds.has(m.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const newSet = new Set(selectedIds);
      paginatedMembers.forEach((m) => newSet.delete(m.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      paginatedMembers.forEach((m) => newSet.add(m.id));
      setSelectedIds(newSet);
    }
  };

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredMembers.map((m) => m.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  useEffect(() => { setCurrentPage(1); }, [searchTerm, periodFilter]);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  const handleAssignToCampaign = async (campaignId: string, campaignType: string, skipExisting: boolean) => {
    if (!user) return;
    setIsAssigning(true);
    try {
      const activeMembers = members.filter(m => m.status === "active");
      if (activeMembers.length === 0) {
        toast.error("Nenhum membro ativo para atribuir.");
        return;
      }

      if (campaignType === "ligacao") {
        const records = activeMembers.map(m => ({
          user_id: user.id,
          campaign_id: campaignId,
          phone: m.phone,
          name: m.name || null,
          status: "pending",
        }));

        const { error } = await supabase
          .from("call_leads")
          .upsert(records, { onConflict: "phone,campaign_id", ignoreDuplicates: skipExisting });

        if (error) throw error;
      } else if (campaignType === "despacho") {
        const leadRecords = activeMembers.map(m => ({
          user_id: user.id,
          phone: m.phone,
          name: m.name || null,
          status: "active",
        }));

        await supabase
          .from("leads")
          .upsert(leadRecords, { onConflict: "phone,user_id", ignoreDuplicates: false });

        const { data: leads } = await supabase
          .from("leads")
          .select("id, phone")
          .eq("user_id", user.id)
          .in("phone", activeMembers.map(m => m.phone));

        if (leads && leads.length > 0) {
          let existingLeadIds = new Set<string>();
          if (skipExisting) {
            const { data: existing } = await supabase
              .from("dispatch_campaign_contacts")
              .select("lead_id")
              .eq("campaign_id", campaignId);
            existingLeadIds = new Set((existing || []).map(e => e.lead_id).filter(Boolean) as string[]);
          }

          const contactRecords = leads
            .filter(l => !skipExisting || !existingLeadIds.has(l.id))
            .map(l => ({
              user_id: user.id,
              campaign_id: campaignId,
              lead_id: l.id,
              status: "active",
            }));

          if (contactRecords.length > 0) {
            const { error } = await supabase
              .from("dispatch_campaign_contacts")
              .insert(contactRecords);

            if (error) throw error;
          }
        }
      }

      toast.success(`${activeMembers.length} membro(s) atribuído(s) à campanha!`);
      setShowAssignDialog(false);
    } catch (error: any) {
      console.error("Erro ao atribuir membros:", error);
      toast.error(error.message || "Erro ao atribuir membros.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleFetchMembers = async () => {
    if (!linkedGroups.length) {
      toast.error("Nenhum grupo vinculado a esta campanha.");
      return;
    }

    setIsFetchingMembers(true);
    const uniqueMembers = new Map<string, { phone: string; name?: string; isAdmin: boolean }>();

    try {
      for (const group of linkedGroups) {
        const instance = instances?.find(i => i.id === group.instanceId);
        if (!instance) continue;

        const payload = buildGroupPayload({
          action: "group.members",
          instance: {
            id: instance.id,
            name: instance.name,
            phone: instance.phoneNumber || "",
            provider: instance.provider,
            externalId: instance.idInstance || "",
            externalToken: instance.tokenInstance || "",
          },
          campaign: { id: campaignId, name: "" },
          group: { jid: group.groupJid },
        });

        const response = await fetch(
          "https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          console.error(`Falha ao buscar membros do grupo ${group.groupName}`);
          continue;
        }

        const data = await response.json();

        let membersList: any[] = [];
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.participants && Array.isArray(item.participants)) {
              membersList.push(...item.participants);
            }
          }
        } else if (data.participants) {
          membersList = data.participants;
        } else if (data.members) {
          membersList = data.members;
        }

        for (const m of membersList) {
          if (m.phone && !m.phone.includes("-group")) {
            const existing = uniqueMembers.get(m.phone);
            uniqueMembers.set(m.phone, {
              phone: m.phone,
              name: m.name || existing?.name || undefined,
              isAdmin: m.isAdmin || m.isSuperAdmin || existing?.isAdmin || false,
            });
          }
        }
      }

      if (uniqueMembers.size > 0) {
        await addMembersBulk(Array.from(uniqueMembers.values()));
        toast.success(`${uniqueMembers.size} membro(s) importado(s) com sucesso!`);
      } else {
        toast.info("Nenhum membro novo encontrado.");
      }
    } catch (error) {
      console.error("Erro ao buscar membros:", error);
      toast.error("Falha ao buscar membros. Tente novamente.");
    } finally {
      setIsFetchingMembers(false);
    }
  };

  const handleAddMember = async () => {
    await addMember({ phone: newMemberPhone, name: newMemberName || undefined });
    setNewMemberPhone("");
    setNewMemberName("");
    setShowAddDialog(false);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(Boolean);

      const membersToAdd = lines.slice(1).map((line) => {
        const [phone, name] = line.split(",").map((s) => s.trim().replace(/"/g, ""));
        return { phone, name };
      }).filter((m) => m.phone);

      if (membersToAdd.length > 0) {
        await addMembersBulk(membersToAdd);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExport = () => {
    const csv = [
      ["Telefone", "Nome", "Status", "Strikes", "Data de Entrada"].join(","),
      ...members.map((m) => [
        m.phone,
        m.name || "",
        m.status,
        m.strikes,
        m.joinedAt,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `membros-${campaignId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRemoveSelected = async () => {
    for (const id of selectedIds) {
      await removeMember(id);
    }
    clearSelection();
    toast.success(`${selectedIds.size} membro(s) removido(s).`);
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    removed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    left: "bg-muted text-muted-foreground",
    muted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  const periodOptions = [
    { days: 7, label: "7 dias" },
    { days: 14, label: "14 dias" },
    { days: 30, label: "30 dias" },
    { days: null as number | null, label: "Todos" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Membros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.active}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Removidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{stats.removed}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Com Strikes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{stats.withStrikes}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Membros</CardTitle>
              <CardDescription>Gerencie os membros do grupo.</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchMembers}
                disabled={isFetchingMembers || !linkedGroups.length}
                title="Puxa a lista atual de participantes do WhatsApp e atualiza entradas/saídas. Use quando um membro estiver com status incorreto."
              >
                {isFetchingMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronizar com WhatsApp
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Importar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={members.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAssignDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Atribuir a Campanha
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowExportWebhookDialog(true)}>
                <Send className="mr-2 h-4 w-4" /> Exportar Webhook
              </Button>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search + Period Filter */}
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por telefone, nome ou LID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Entrada:</span>
              {periodOptions.map((p) => (
                <Button
                  key={String(p.days)}
                  size="sm"
                  variant={periodFilter === p.days ? "default" : "outline"}
                  onClick={() => setPeriodFilter(p.days)}
                  className="h-8 text-xs"
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Selection Bar */}
          {someSelected && (
            <div className="sticky top-0 z-10 bg-primary text-primary-foreground rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">☑️ {selectedIds.size} selecionados</span>
                {selectedIds.size < filteredMembers.length && (
                  <Button size="sm" variant="secondary" onClick={selectAllFiltered} className="text-xs h-7">
                    Selecionar todos os {filteredMembers.length}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="secondary" className="gap-1">
                      <Play className="h-3.5 w-3.5" /> Executar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setShowExecuteSequenceDialog(true)}>
                      <ListOrdered className="mr-2 h-4 w-4" /> Executar Sequência
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowExecuteListDialog(true)}>
                      <FileText className="mr-2 h-4 w-4" /> Executar Lista
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="destructive" onClick={handleRemoveSelected} className="gap-1">
                  <UserMinus className="h-3.5 w-3.5" /> Remover
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection} className="text-primary-foreground hover:text-primary-foreground/80">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Nenhum membro</h3>
              <p className="text-muted-foreground">Adicione membros manualmente ou importe de um arquivo CSV.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>LID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Strikes</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMembers.map((member) => (
                    <TableRow key={member.id} className={selectedIds.has(member.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(member.id)}
                          onCheckedChange={() => toggleOne(member.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {member.phone}
                          {member.isAdmin && <Shield className="h-4 w-4 text-primary" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.lid ? (
                          <span
                            className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground"
                            title={member.lid}
                            onClick={() => { navigator.clipboard.writeText(member.lid!); toast.success("LID copiado!"); }}
                          >
                            {member.lid.length > 16 ? `${member.lid.slice(0, 10)}...@lid` : member.lid}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{member.name || "-"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[member.status]}>
                          {member.status === "active" && "Ativo"}
                          {member.status === "removed" && "Removido"}
                          {member.status === "left" && "Saiu"}
                          {member.status === "muted" && "Silenciado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.strikes > 0 ? <Badge variant="destructive">{member.strikes}</Badge> : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(member.joinedAt), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.status === "active" ? (
                              <DropdownMenuItem className="text-destructive" onClick={() => removeMember(member.id)}>
                                <UserMinus className="mr-2 h-4 w-4" /> Marcar como removido
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => reactivateMember(member.id)}>
                                <UserCheck className="mr-2 h-4 w-4" /> Marcar como ativo
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Itens por página:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                      <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[25, 50, 100].map((option) => (
                          <SelectItem key={option} value={option.toString()}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">({startIndex + 1}-{endIndex} de {totalItems})</span>
                  </div>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {getVisiblePages().map((page, index) =>
                        page === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
            <DialogDescription>Adicione um novo membro ao grupo manualmente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input id="phone" placeholder="5511999999999" value={newMemberPhone} onChange={(e) => setNewMemberPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input id="name" placeholder="Nome do contato" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddMember} disabled={!newMemberPhone || isAdding}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Webhook Dialog */}
      <ExportWebhookDialog open={showExportWebhookDialog} onOpenChange={setShowExportWebhookDialog} campaignId={campaignId} />

      {/* Assign to Campaign Dialog */}
      <AddToCampaignDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        selectedCount={stats.active}
        campaigns={availableCampaigns}
        onSubmit={handleAssignToCampaign}
        isLoading={isAssigning}
      />

      {/* Execute Sequence Dialog */}
      <ExecuteSequenceDialog
        open={showExecuteSequenceDialog}
        onOpenChange={setShowExecuteSequenceDialog}
        selectedMembers={selectedMembers}
        campaignId={campaignId}
      />

      {/* Execute List Dialog */}
      <ExecuteListDialog
        open={showExecuteListDialog}
        onOpenChange={setShowExecuteListDialog}
        selectedMembers={selectedMembers}
        campaignId={campaignId}
      />
    </div>
  );
}
