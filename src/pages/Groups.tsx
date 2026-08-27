import React, { useState, useEffect } from "react";
import { useGroups, WhatsAppGroupItem, GroupFilters } from "@/hooks/useGroups";
import { GroupCard } from "@/components/groups/GroupCard";
import { GroupTableRow } from "@/components/groups/GroupTableRow";
import { GroupDetailsDrawer } from "@/components/groups/GroupDetailsDrawer";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UsersRound, Search, Filter, ArrowUpDown, RefreshCw, ChevronLeft, ChevronRight, Wand2, LayoutGrid, List, Radio, CheckCircle2, PlusCircle, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface RemoteGroupItem {
  groupJid: string;
  name: string;
  description: string | null;
  pictureUrl: string | null;
  participantsCount: number;
}

export default function Groups() {
  const { activeCompanyId } = useCompany();
  const [search, setSearch] = useState("");
  const [instanceId, setInstanceId] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<GroupFilters["sort"]>("most_recent");
  const [hasDescriptionOnly, setHasDescriptionOnly] = useState(false);
  const [hasPhotoOnly, setHasPhotoOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppGroupItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sync / Import Modal state
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedSyncInstance, setSelectedSyncInstance] = useState<string>("");
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);
  const [remoteGroups, setRemoteGroups] = useState<RemoteGroupItem[]>([]);
  const [selectedJids, setSelectedJids] = useState<Set<string>>(new Set());
  const [remoteSearch, setRemoteSearch] = useState("");

  // Fetch groups with filters
  const {
    groups,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
    refetch,
    migrateGroups,
    isMigrating,
    syncInstanceGroups,
    isSyncingInstance,
  } = useGroups({
    search,
    instanceId,
    status,
    hasDescriptionOnly,
    hasPhotoOnly,
    sort,
    page,
    pageSize: 15,
  });

  // Auto-run migration once on mount to organize group entries out of leads table into whatsapp_groups
  useEffect(() => {
    migrateGroups();
  }, []);

  // Fetch instances for filter dropdown and sync dialog
  const { data: instances } = useQuery({
    queryKey: ["instances_list_for_groups_filter"],
    queryFn: async () => {
      const { data } = await supabase.from("instances").select("id, name, phone");
      return data || [];
    },
  });

  const handleOpenDetails = (group: WhatsAppGroupItem) => {
    setSelectedGroup(group);
    setDrawerOpen(true);
  };

  // Fetch remote groups from WhatsApp instance for selection
  const handleFetchRemoteGroups = async () => {
    if (!selectedSyncInstance) {
      toast.error("Selecione uma conexão de WhatsApp.");
      return;
    }

    setIsFetchingRemote(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-instance-groups", {
        body: {
          instanceId: selectedSyncInstance,
          companyId: activeCompanyId,
          fetchOnly: true,
        },
      });

      if (error) throw error;

      if (data?.success && Array.isArray(data.groups)) {
        setRemoteGroups(data.groups);
        // Select all groups by default
        const allJids = new Set<string>(data.groups.map((g: RemoteGroupItem) => g.groupJid));
        setSelectedJids(allJids);
        toast.success(`${data.groups.length} grupos encontrados na conexão!`);
      } else {
        toast.info("Nenhum grupo encontrado nesta conexão do WhatsApp.");
        setRemoteGroups([]);
        setSelectedJids(new Set());
      }
    } catch (err: any) {
      toast.error(`Erro ao buscar grupos da conexão: ${err.message || String(err)}`);
    } finally {
      setIsFetchingRemote(false);
    }
  };

  // Toggle single group selection
  const handleToggleSelectJid = (jid: string) => {
    setSelectedJids((prev) => {
      const next = new Set(prev);
      if (next.has(jid)) {
        next.delete(jid);
      } else {
        next.add(jid);
      }
      return next;
    });
  };

  // Toggle select all groups
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allJids = new Set<string>(remoteGroups.map((g) => g.groupJid));
      setSelectedJids(allJids);
    } else {
      setSelectedJids(new Set());
    }
  };

  // Submit selected groups import to CRM
  const handleImportSelectedGroups = () => {
    if (!selectedSyncInstance || selectedJids.size === 0) {
      toast.error("Selecione pelo menos 1 grupo para adicionar.");
      return;
    }

    const selectedGroupsObjects = remoteGroups.filter((g) => selectedJids.has(g.groupJid));

    syncInstanceGroups({
      instanceId: selectedSyncInstance,
      selectedJids: Array.from(selectedJids),
      groups: selectedGroupsObjects,
    });

    setSyncDialogOpen(false);
  };

  // Filtered remote groups by search query
  const filteredRemoteGroups = remoteGroups.filter(
    (g) =>
      g.name.toLowerCase().includes(remoteSearch.toLowerCase()) ||
      g.groupJid.toLowerCase().includes(remoteSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <UsersRound className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Groups</h1>
                <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-0.5 text-xs">
                  {totalCount} {totalCount === 1 ? "grupo" : "grupos"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gerencie e visualize os grupos conectados às suas instâncias.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Button to sync & select groups from WhatsApp Instance */}
          <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Radio className="h-3.5 w-3.5" />
                Buscar Grupos da Instância
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl rounded-2xl bg-card border border-border shadow-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Radio className="h-5 w-5 text-emerald-500" /> Buscar e Selecionar Grupos da Conexão
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Selecione uma conexão WhatsApp para listar todos os grupos disponíveis e selecione quais deseja adicionar ao CRM.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {/* Step 1: Select Instance & Search Button */}
                <div className="flex items-end gap-3 bg-muted/30 p-3.5 rounded-xl border border-border/50">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Conexão do WhatsApp
                    </label>
                    <Select
                      value={selectedSyncInstance}
                      onValueChange={(val) => {
                        setSelectedSyncInstance(val);
                        setRemoteGroups([]);
                        setSelectedJids(new Set());
                      }}
                    >
                      <SelectTrigger className="h-10 text-xs bg-background">
                        <SelectValue placeholder="Selecione uma conexão..." />
                      </SelectTrigger>
                      <SelectContent>
                        {instances?.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} {i.phone ? `(${i.phone})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    disabled={!selectedSyncInstance || isFetchingRemote}
                    onClick={handleFetchRemoteGroups}
                    className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
                  >
                    {isFetchingRemote ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    {isFetchingRemote ? "Buscando..." : "Buscar Grupos"}
                  </Button>
                </div>

                {/* Step 2: List & Selectable Groups */}
                {remoteGroups.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      {/* Search inside modal */}
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Filtrar por nome do grupo..."
                          value={remoteSearch}
                          onChange={(e) => setRemoteSearch(e.target.value)}
                          className="pl-8 h-8 text-xs bg-background"
                        />
                      </div>

                      {/* Select All Checkbox */}
                      <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border border-border text-xs font-semibold shrink-0">
                        <Checkbox
                          id="select-all-groups"
                          checked={selectedJids.size === remoteGroups.length && remoteGroups.length > 0}
                          onCheckedChange={(checked) => handleToggleSelectAll(!!checked)}
                        />
                        <label htmlFor="select-all-groups" className="cursor-pointer text-xs">
                          Selecionar Todos ({selectedJids.size}/{remoteGroups.length})
                        </label>
                      </div>
                    </div>

                    {/* Scrollable list of selectable groups */}
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                      {filteredRemoteGroups.map((g) => {
                        const isChecked = selectedJids.has(g.groupJid);
                        return (
                          <div
                            key={g.groupJid}
                            onClick={() => handleToggleSelectJid(g.groupJid)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? "bg-emerald-500/10 border-emerald-500/40"
                                : "bg-card hover:bg-muted/40 border-border/60"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleToggleSelectJid(g.groupJid)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{g.name}</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">{g.groupJid}</p>
                              </div>
                            </div>

                            <Badge variant="outline" className="text-[10px] font-semibold gap-1 shrink-0 bg-background">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {g.participantsCount} {g.participantsCount === 1 ? "membro" : "membros"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setSyncDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={selectedJids.size === 0 || isSyncingInstance}
                  onClick={handleImportSelectedGroups}
                  className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {isSyncingInstance ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                  {isSyncingInstance ? "Adicionando..." : `Adicionar ${selectedJids.size} ${selectedJids.size === 1 ? "Grupo" : "Grupos"} ao CRM`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={() => migrateGroups()}
            disabled={isMigrating}
            className="gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200/60"
            title="Extrai grupos cadastrados na tabela de Leads e move para a tabela de Grupos"
          >
            <Wand2 className={`h-3.5 w-3.5 ${isMigrating ? "animate-spin" : ""}`} />
            {isMigrating ? "Organizando..." : "Organizar Grupos da Base"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar grupo por nome, descrição ou ID (@g.us)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-10 text-xs bg-background/60"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-background border border-border rounded-xl p-0.5">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5 rounded-lg"
              onClick={() => setViewMode("table")}
              title="Visualizar em Colunas (Tabela)"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1.5 rounded-lg"
              onClick={() => setViewMode("grid")}
              title="Visualizar em Cards"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
          </div>

          {/* Instance Filter */}
          <Select value={instanceId} onValueChange={(v) => { setInstanceId(v); setPage(1); }}>
            <SelectTrigger className="w-[170px] h-10 text-xs bg-background/60">
              <SelectValue placeholder="Instância" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Instâncias</SelectItem>
              {instances?.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name} {i.phone ? `(${i.phone})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Filter */}
          <Select value={sort} onValueChange={(v: any) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-10 text-xs bg-background/60">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most_recent">Mais Recentes</SelectItem>
              <SelectItem value="oldest">Mais Antigos</SelectItem>
              <SelectItem value="name_asc">Nome (A - Z)</SelectItem>
              <SelectItem value="name_desc">Nome (Z - A)</SelectItem>
              <SelectItem value="most_participants">Mais Participantes</SelectItem>
              <SelectItem value="least_participants">Menos Participantes</SelectItem>
            </SelectContent>
          </Select>

          {/* Toggle Menu Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 text-xs gap-2 bg-background/60">
                <Filter className="h-3.5 w-3.5" />
                Filtros
                {(hasDescriptionOnly || hasPhotoOnly) && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/20 text-primary font-bold">
                    ✓
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuCheckboxItem
                checked={hasDescriptionOnly}
                onCheckedChange={setHasDescriptionOnly}
                className="text-xs"
              >
                Com descrição apenas
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={hasPhotoOnly}
                onCheckedChange={setHasPhotoOnly}
                className="text-xs"
              >
                Com foto apenas
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Table / Grid View */}
      {isLoading ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground font-medium">
          Carregando grupos...
        </div>
      ) : groups.length > 0 ? (
        viewMode === "table" ? (
          /* Table View */
          <div className="overflow-x-auto w-full bg-card rounded-2xl border border-border shadow-sm">
            <table className="w-full border-collapse">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Grupo</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">ID do Grupo (JID)</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Participantes</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Admins</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Instância</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Última Atividade</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left border-b border-border">Data</th>
                  <th className="px-4 py-3 border-b border-border w-24 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, i) => (
                  <GroupTableRow
                    key={group.id}
                    group={group}
                    isEven={i % 2 === 0}
                    onOpenDetails={handleOpenDetails}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} onOpenDetails={handleOpenDetails} />
            ))}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-card rounded-3xl border border-border p-8 space-y-4 shadow-sm">
          <div className="h-16 w-16 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <UsersRound className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-foreground">Nenhum grupo encontrado</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Busque e selecione os grupos de uma instância do WhatsApp para adicionar à sua plataforma.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              onClick={() => setSyncDialogOpen(true)}
              className="text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Radio className="h-3.5 w-3.5" />
              Buscar Grupos da Instância
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => migrateGroups()}
              disabled={isMigrating}
              className="text-xs font-bold gap-2 text-indigo-600 dark:text-indigo-400"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Organizar Grupos da Base
            </Button>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-muted-foreground">
          <span>
            Mostrando <strong>{groups.length}</strong> de <strong>{totalCount}</strong> grupos (Página {page} de {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs font-semibold gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-xs font-semibold gap-1"
            >
              Próximo <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Details Drawer */}
      <GroupDetailsDrawer
        group={selectedGroup}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
