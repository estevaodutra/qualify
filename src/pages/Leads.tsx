import { useState, useMemo } from "react";
import { useLeads, Lead, LeadFilters } from "@/hooks/useLeads";
import { useCallQueue } from "@/hooks/useCallQueue";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { CampaignOption } from "@/components/leads/ImportLeadsDialog";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { cn, formatPhone } from "@/lib/utils";
import { toast } from "sonner";
import { MetricCard } from "@/components/dispatch/MetricCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CreateLeadDialog,
  EditLeadDialog,
  ImportLeadsDialog,
  AddToQueueDialog,
  LeadActionsMenu,
  BulkActionsBar,
  LeadHistoryDialog,
  AddToCampaignDialog,
  BulkTagDialog,
  ExtractLeadsDialog,
} from "@/components/leads";
import {
  Users,
  UserCheck,
  Megaphone,
  UserX,
  Plus,
  Search,
  Menu,
  Download,
  Upload,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  import_csv: "Importação CSV",
  whatsapp_group: "Grupo WhatsApp",
  api: "API Externa",
  manual: "Manual",
  call_campaign: "Campanha Ligação",
  dispatch_campaign: "Campanha Despacho",
  campaign_manual: "Campanha (manual)",
};

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  grupos: { label: "👥 Grupo", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  ligacao: { label: "📞 Ligação", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  despacho: { label: "📱 WhatsApp", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800" },
};

export default function Leads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllResults, setSelectAllResults] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [extractOpen, setExtractOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [tagDialogMode, setTagDialogMode] = useState<"add" | "remove" | null>(null);

  const filters: LeadFilters = {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    campaignType: typeFilter !== "all" ? typeFilter : undefined,
    sourceType: sourceFilter !== "all" ? sourceFilter : undefined,
    sourceGroupName: groupFilter !== "all" ? groupFilter : undefined,
    tags: tagFilter !== "all" ? [tagFilter] : undefined,
    page,
  };

  const {
    leads, totalCount, stats, isLoading, groupNames, availableTags,
    createLead, updateLead, deleteLead, bulkDelete, bulkAddTags, bulkRemoveTags, bulkAddToCampaign, importLeads, pageSize,
  } = useLeads(filters);

  const { addToQueue } = useCallQueue();
  const { campaigns: callCampaigns } = useCallCampaigns();
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();
  const { campaigns: groupCampaigns } = useGroupCampaigns();

  const allCampaigns = useMemo<CampaignOption[]>(() => [
    ...callCampaigns.map((c) => ({ id: c.id, name: c.name, type: "ligacao" })),
    ...dispatchCampaigns.map((c) => ({ id: c.id, name: c.name, type: "despacho" })),
    ...groupCampaigns.map((c) => ({ id: c.id, name: c.name, type: "grupos" })),
  ], [callCampaigns, dispatchCampaigns, groupCampaigns]);

  const allCampaignsWithStatus = useMemo(() => [
    ...callCampaigns.map((c: any) => ({ id: c.id, name: c.name, type: "ligacao", status: c.status })),
    ...dispatchCampaigns.map((c: any) => ({ id: c.id, name: c.name, type: "despacho", status: c.status })),
    ...groupCampaigns.map((c: any) => ({ id: c.id, name: c.name, type: "grupos", status: c.status })),
  ], [callCampaigns, dispatchCampaigns, groupCampaigns]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    setSelectAllResults(false);
  };

  const toggleAll = () => {
    if (selectAllResults || (leads.length > 0 && selectedIds.size === leads.length)) {
      setSelectedIds(new Set());
      setSelectAllResults(false);
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
      setSelectAllResults(true);
    }
  };

  const handleSelectAllResults = () => {
    setSelectAllResults(true);
  };

  const effectiveCount = selectAllResults ? totalCount : selectedIds.size;


  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // Fetch group campaigns for names (Origem = campaign name)
      const { data: gcList } = await supabase.from("group_campaigns").select("id, name");
      const gcMap = new Map((gcList || []).map(g => [g.id, g.name]));

      // Fetch linked groups for real WhatsApp group name (Grupo column)
      const { data: cgList } = await supabase.from("campaign_groups").select("campaign_id, group_jid, group_name");
      const groupNameMap = new Map<string, string>();
      (cgList || []).forEach(cg => {
        if (!groupNameMap.has(cg.campaign_id)) {
          groupNameMap.set(cg.campaign_id, cg.group_name);
        }
      });

      const { data: allMembers } = await supabase
        .from("group_members")
        .select("phone, name, group_campaign_id")
        .eq("status", "active");

      const validMembers = allMembers?.filter(m => !m.phone.includes("-group")) || [];

      const leadRecords = validMembers.map(m => ({
        user_id: user.id,
        phone: m.phone,
        name: m.name || null,
        active_campaign_id: m.group_campaign_id,
        active_campaign_type: "grupos",
        status: "active" as const,
        source_type: "whatsapp_group",
        source_name: gcMap.get(m.group_campaign_id) || null,
        source_group_id: m.group_campaign_id,
        source_group_name: groupNameMap.get(m.group_campaign_id) || null,
      }));

      for (let i = 0; i < leadRecords.length; i += 500) {
        const batch = leadRecords.slice(i, i + 500);
        await supabase.from("leads").upsert(batch, {
          onConflict: "phone,user_id",
          ignoreDuplicates: false,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });

      toast.success(`${validMembers.length} leads sincronizados com sucesso.`);
    } catch {
      toast.error("Erro ao sincronizar leads.");
    } finally {
      setIsSyncing(false);
    }
  };

  const getSelectedIds = async (): Promise<string[]> => {
    if (!selectAllResults) return Array.from(selectedIds);
    // Fetch all IDs matching current filters
    let query = supabase.from("leads").select("id");
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.sourceType) query = query.eq("source_type", filters.sourceType);
    if (filters.campaignType) query = query.eq("active_campaign_type", filters.campaignType);
    if (filters.sourceGroupName) query = query.eq("source_group_name", filters.sourceGroupName);
    if (filters.tags && filters.tags.length > 0) query = query.overlaps("tags", filters.tags);
    const { data } = await query;
    return (data || []).map(d => d.id);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectAllResults(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Consulte, crie, modifique ou remova seus leads"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              Sync
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" /> Extrair
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setExtractOpen(true)}>
                  <Users className="h-4 w-4 mr-2" /> De Grupos do WhatsApp
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" /> De Planilha (CSV/Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Em breve: importação via API externa")}>
                  <RefreshCw className="h-4 w-4 mr-2" /> De API Externa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Lead
            </Button>
          </div>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total" value={stats.total.toLocaleString()} icon={Users} />
        <MetricCard title="Ativos" value={stats.active.toLocaleString()} icon={UserCheck} />
        <MetricCard title="Em Campanha" value={stats.inCampaign.toLocaleString()} icon={Megaphone} />
        <MetricCard title="Inativos" value={stats.inactive.toLocaleString()} icon={UserX} />
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        count={effectiveCount}
        totalCount={totalCount}
        allSelected={selectAllResults}
        onSelectAll={handleSelectAllResults}
        onAddToCampaign={() => setCampaignDialogOpen(true)}
        onAddTag={() => setTagDialogMode("add")}
        onRemoveTag={() => setTagDialogMode("remove")}
        onDelete={async () => {
          const ids = await getSelectedIds();
          bulkDelete.mutate(ids);
          clearSelection();
        }}
        onCancel={clearSelection}
      />

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <span className="text-sm text-muted-foreground">{totalCount} resultados</span>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); if (v !== "grupos") setGroupFilter("all"); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="grupos">👥 Grupo</SelectItem>
            <SelectItem value="ligacao">📞 Ligação</SelectItem>
            <SelectItem value="despacho">📱 WhatsApp</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); if (v !== "whatsapp_group") setGroupFilter("all"); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            <SelectItem value="import_csv">Importação CSV</SelectItem>
            <SelectItem value="whatsapp_group">Grupo WhatsApp</SelectItem>
            <SelectItem value="api">API Externa</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="call_campaign">Campanha Ligação</SelectItem>
            <SelectItem value="dispatch_campaign">Campanha Despacho</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tags</SelectItem>
            {availableTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(typeFilter === "grupos" || sourceFilter === "whatsapp_group") && (
          <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecionar Grupo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groupNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon"><Menu className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importar leads
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const csv = ["nome,telefone,lid,email,tags,origem,tipo,grupo", ...leads.map((l) =>
                `"${l.name || ""}","${l.phone || ""}","${l.lid || ""}","${l.email || ""}","${(l.tags || []).join(",")}","${SOURCE_LABELS[l.source_type || ""] || ""}","${l.active_campaign_type || ""}","${l.source_group_name || ""}"`
              )].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "leads.csv"; a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="h-4 w-4 mr-2" /> Exportar leads
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                 <Checkbox
                  checked={selectAllResults || (leads.length > 0 && selectedIds.size === leads.length)}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>LID</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : leads.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum lead encontrado.</TableCell></TableRow>
            ) : (
              leads.map((lead) => {
                const typeBadge = lead.active_campaign_type ? TYPE_BADGES[lead.active_campaign_type] : null;
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{lead.name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.phone ? formatPhone(lead.phone) : "—"}</TableCell>
                    <TableCell>
                      {lead.lid ? (
                        <span
                          className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground"
                          title={lead.lid}
                          onClick={() => { navigator.clipboard.writeText(lead.lid!); toast.success("LID copiado!"); }}
                        >
                          {lead.lid.length > 16 ? `${lead.lid.slice(0, 10)}...@lid` : lead.lid}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {lead.source_name || SOURCE_LABELS[lead.source_type || ""] || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {typeBadge ? (
                        <Badge variant="outline" className={cn("text-xs border", typeBadge.className)}>
                          {typeBadge.label}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{lead.source_group_name || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(lead.tags || []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                        {(lead.tags || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">+{lead.tags.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <LeadActionsMenu
                        lead={lead}
                        onEdit={setEditLead}
                        onHistory={setHistoryLead}
                        onAddTag={(l) => { setSelectedIds(new Set([l.id])); setTagDialogMode("add"); }}
                        onAddToCampaign={(l) => { setSelectedIds(new Set([l.id])); setCampaignDialogOpen(true); }}
                        onBlock={(l) => updateLead.mutate({ id: l.id, status: "blocked" })}
                        onDelete={(l) => deleteLead.mutate(l.id)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => { createLead.mutate(data); setCreateOpen(false); }}
        isLoading={createLead.isPending}
      />

      <EditLeadDialog
        lead={editLead}
        onOpenChange={(o) => !o && setEditLead(null)}
        onSubmit={(data) => { updateLead.mutate(data); setEditLead(null); }}
        isLoading={updateLead.isPending}
      />

      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(data) => { importLeads.mutate(data); setImportOpen(false); }}
        isLoading={importLeads.isPending}
        campaigns={allCampaigns}
      />

      <AddToQueueDialog
        open={queueOpen}
        onOpenChange={setQueueOpen}
        selectedCount={selectedIds.size}
        onSubmit={(campaignId, position) => {
          addToQueue.mutate({ campaignId, leadIds: Array.from(selectedIds), position });
          setQueueOpen(false);
          clearSelection();
        }}
        isLoading={addToQueue.isPending}
      />

      <LeadHistoryDialog
        lead={historyLead}
        onOpenChange={(o) => !o && setHistoryLead(null)}
      />

      <AddToCampaignDialog
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        selectedCount={effectiveCount}
        campaigns={allCampaignsWithStatus}
        onSubmit={async (campaignId, campaignType, skipExisting) => {
          const ids = await getSelectedIds();
          bulkAddToCampaign.mutate({ ids, campaignId, campaignType, skipExisting });
          setCampaignDialogOpen(false);
          clearSelection();
        }}
        isLoading={bulkAddToCampaign.isPending}
      />

      {tagDialogMode && (
        <BulkTagDialog
          open={!!tagDialogMode}
          onOpenChange={(o) => !o && setTagDialogMode(null)}
          mode={tagDialogMode}
          leads={leads}
          selectedIds={selectedIds}
          onSubmit={async (tags) => {
            const ids = await getSelectedIds();
            if (tagDialogMode === "add") {
              bulkAddTags.mutate({ ids, tags });
            } else {
              bulkRemoveTags.mutate({ ids, tags });
            }
            setTagDialogMode(null);
            clearSelection();
          }}
          isLoading={bulkAddTags.isPending || bulkRemoveTags.isPending}
        />
      )}

      <ExtractLeadsDialog
        open={extractOpen}
        onOpenChange={setExtractOpen}
      />
    </div>
  );
}
