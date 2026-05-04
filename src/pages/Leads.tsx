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
  grupos: { label: "Grupo", className: "bg-[#2637C9]/10 text-[#7B8FFF] border-[#2637C9]/20" },
  ligacao: { label: "Ligação", className: "bg-[#22DD4F]/10 text-[#22DD4F] border-[#22DD4F]/20" },
  despacho: { label: "WhatsApp", className: "bg-[#006EFF]/10 text-[#6BAEFF] border-[#006EFF]/20" },
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
    <div className="flex flex-col gap-6 p-8 overflow-y-auto flex-1 min-h-0 bg-background">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight m-0 font-['Sora']">Leads</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Gerencie sua base de contatos</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-1.5 px-3 font-medium text-[13px] bg-transparent border-border text-foreground shadow-none rounded-md">
                <Download className="w-3.5 h-3.5" /> Ferramentas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-border bg-card">
              <DropdownMenuItem className="rounded-lg m-1 gap-2.5 font-medium cursor-pointer" onClick={() => setExtractOpen(true)}>
                <Users className="h-4 w-4" /> De Grupos do WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="rounded-lg m-1 gap-2.5 font-medium cursor-pointer" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> De Planilha (CSV/Excel)
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg m-1 gap-2.5 font-medium cursor-pointer" onClick={() => handleSync()} disabled={isSyncing}>
                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} /> Sincronizar Base
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setCreateOpen(true)} className="h-9 gap-1.5 px-3.5 font-medium text-[13px] bg-primary text-primary-foreground shadow-none rounded-md hover:bg-primary/90">
            <Plus className="w-3.5 h-3.5" /> Novo Lead
          </Button>
        </div>
      </div>

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

      <div className="bg-card border border-border rounded-lg shadow-[0_1px_2px_hsl(220_15%_10%/0.05)] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5 border-b border-border">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              className="h-8 pl-8 text-[13px] bg-secondary border-transparent rounded-md focus-visible:ring-1 focus-visible:ring-primary shadow-none text-foreground"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-[13px] font-medium border-border bg-transparent shadow-none w-[110px] rounded-md">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); if (v !== "grupos") setGroupFilter("all"); }}>
            <SelectTrigger className="h-8 text-[13px] font-medium border-border bg-transparent shadow-none w-[110px] rounded-md">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tipos</SelectItem>
              <SelectItem value="grupos">Grupo</SelectItem>
              <SelectItem value="ligacao">Ligação</SelectItem>
              <SelectItem value="despacho">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-[13px] font-medium border-border bg-transparent shadow-none w-[110px] rounded-md">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tags</SelectItem>
              {availableTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border w-10">
                  <Checkbox
                    checked={selectAllResults || (leads.length > 0 && selectedIds.size === leads.length)}
                    onCheckedChange={toggleAll}
                    className="rounded-sm w-3.5 h-3.5"
                  />
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Nome</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Telefone</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Tag</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Origem</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Data</th>
                <th className="px-4 py-2.5 border-b border-border w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-sm text-muted-foreground font-medium">Carregando leads...</td></tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <p className="text-sm text-muted-foreground font-medium">Nenhum lead encontrado.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead, i) => {
                  const isEven = i % 2 === 0;
                  // Map statuses
                  let statusLabel = "Pendente";
                  let bgStatus = "hsl(220 10% 96%)";
                  let textStatus = "hsl(220 10% 45%)";
                  let dotStatus = "hsl(220 10% 45%)";
                  
                  if (lead.status === "active") {
                    statusLabel = "Ativo";
                    bgStatus = "hsl(142 71% 45%/0.12)";
                    textStatus = "hsl(142 61% 35%)";
                    dotStatus = "hsl(142 61% 35%)";
                  } else if (lead.status === "inactive" || lead.status === "blocked") {
                    statusLabel = "Inativo";
                    bgStatus = "hsl(0 72% 51%/0.1)";
                    textStatus = "hsl(0 62% 45%)";
                    dotStatus = "hsl(0 62% 45%)";
                  }

                  const firstLetter = (lead.name || "?")[0].toUpperCase();

                  return (
                    <tr key={lead.id} className={cn("border-b border-border/50", isEven ? "bg-transparent" : "bg-muted/30")}>
                      <td className="px-4 py-3 align-middle">
                        <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} className="rounded-sm w-3.5 h-3.5" />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[12px] font-semibold flex items-center justify-center shrink-0">
                            {firstLetter}
                          </div>
                          <span className="text-[13px] font-medium text-foreground">{lead.name || "Sem Nome"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-[12px] font-mono text-muted-foreground">
                        {lead.phone ? formatPhone(lead.phone) : "—"}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {(lead.tags || []).slice(0, 1).map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">
                              {tag}
                            </span>
                          ))}
                          {(lead.tags || []).length > 1 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[11px] font-medium">
                              +{(lead.tags?.length || 0) - 1}
                            </span>
                          )}
                          {(!lead.tags || lead.tags.length === 0) && <span className="text-[12px] text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-[13px] text-muted-foreground">
                        {lead.source_name || SOURCE_LABELS[lead.source_type || ""] || "—"}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium" style={{ backgroundColor: bgStatus, color: textStatus }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotStatus }} />
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-[12px] font-mono text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <LeadActionsMenu
                          lead={lead}
                          onEdit={setEditLead}
                          onHistory={setHistoryLead}
                          onAddTag={(l) => { setSelectedIds(new Set([l.id])); setTagDialogMode("add"); }}
                          onAddToCampaign={(l) => { setSelectedIds(new Set([l.id])); setCampaignDialogOpen(true); }}
                          onBlock={(l) => updateLead.mutate({ id: l.id, status: "blocked" })}
                          onDelete={(l) => deleteLead.mutate(l.id)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <Button
                      key={p}
                      variant={page === p ? "default" : "ghost"}
                      size="sm"
                      className={cn("h-7 w-7 rounded-md text-[12px] font-medium p-0", page === p ? "bg-primary text-white shadow-none" : "text-muted-foreground")}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

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
