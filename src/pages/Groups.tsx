import React, { useState, useEffect } from "react";
import { useGroups, WhatsAppGroupItem, GroupFilters } from "@/hooks/useGroups";
import { GroupCard } from "@/components/groups/GroupCard";
import { GroupTableRow } from "@/components/groups/GroupTableRow";
import { GroupDetailsDrawer } from "@/components/groups/GroupDetailsDrawer";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UsersRound, Search, Filter, ArrowUpDown, RefreshCw, ChevronLeft, ChevronRight, Wand2, LayoutGrid, List } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Groups() {
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

  // Fetch groups with filters
  const { groups, totalCount, totalPages, isLoading, isFetching, refetch, migrateGroups, isMigrating } = useGroups({
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

  // Fetch instances for filter dropdown
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
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
              Os grupos das suas conexões do WhatsApp aparecerão aqui automaticamente após a sincronização.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
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
            {(search || instanceId !== "all" || hasDescriptionOnly || hasPhotoOnly) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setInstanceId("all");
                  setStatus("all");
                  setHasDescriptionOnly(false);
                  setHasPhotoOnly(false);
                }}
                className="text-xs font-semibold"
              >
                Limpar Filtros
              </Button>
            )}
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
