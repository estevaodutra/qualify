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
import { MessagesSquare, Search, Filter, ArrowUpDown, RefreshCw, ChevronLeft, ChevronRight, Wand2, LayoutGrid, List, Radio, CheckCircle2, PlusCircle, Users, Smartphone, X, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useGroupFolders } from "@/hooks/useGroupFolders";
import { GroupFolderTree } from "@/components/groups/GroupFolderTree";
import { toast } from "sonner";

interface RemoteGroupItem {
  groupJid: string;
  name: string;
  description: string | null;
  pictureUrl: string | null;
  participantsCount: number;
  participants?: any[];
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
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);
  const [folderPendingDelete, setFolderPendingDelete] = useState<string | null>(null);
  const [groupPendingRemove, setGroupPendingRemove] = useState<WhatsAppGroupItem | null>(null);

  // Group Folders hook
  const {
    folders,
    assignments,
    createFolder,
    renameFolder,
    deleteFolder,
    assignGroupToFolder,
    reorderFolders,
  } = useGroupFolders();

  // Sync / Import Modal state
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedSyncInstance, setSelectedSyncInstance] = useState<string>("");
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);
  const [remoteGroups, setRemoteGroups] = useState<RemoteGroupItem[]>([]);
  const [selectedJids, setSelectedJids] = useState<Set<string>>(new Set());
  const [remoteSearch, setRemoteSearch] = useState("");
  const [remoteGroupFilterTab, setRemoteGroupFilterTab] = useState<"all" | "new" | "registered">("all");
  const [targetFolderIdForImport, setTargetFolderIdForImport] = useState<string | null | undefined>(undefined);

  // Fetch groups with filters from CRM database
  const {
    groups,
    totalCount,
    globalTotalCount,
    allRegisteredJids,
    totalPages,
    isLoading,
    isFetching,
    refetch,
    syncInstanceGroups,
    isSyncingInstance,
    removeGroupFromCrmAsync,
    isRemovingFromCrm,
  } = useGroups({
    search,
    instanceId,
    status,
    folderId: selectedFolderId,
    hasDescriptionOnly,
    hasPhotoOnly,
    sort,
    page,
    pageSize: 15,
  });

  // Set of all JIDs currently registered in the CRM
  const registeredJidsSet = React.useMemo(() => {
    return new Set((allRegisteredJids || []).map((j) => j.toLowerCase().trim()));
  }, [allRegisteredJids]);

  // Calculate folder counts
  const countByFolder: Record<string, number> = {};
  folders.forEach((f) => {
    countByFolder[f.id] = 0;
  });
  let assignedCount = 0;
  Object.values(assignments).forEach((fId) => {
    if (countByFolder[fId] !== undefined) {
      countByFolder[fId]++;
      assignedCount++;
    }
  });
  const uncategorizedCount = Math.max(0, globalTotalCount - assignedCount);

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
        
        // By default, select ONLY groups that are NOT yet registered in the CRM
        const newJids = new Set<string>();
        data.groups.forEach((g: RemoteGroupItem) => {
          if (!registeredJidsSet.has(g.groupJid.toLowerCase().trim())) {
            newJids.add(g.groupJid);
          }
        });

        // Pre-select new groups
        setSelectedJids(newJids);

        const newCount = newJids.size;
        const alreadyCount = data.groups.length - newCount;
        toast.success(
          `${data.groups.length} grupos encontrados na conexão (${newCount} novos, ${alreadyCount} já no CRM)!`
        );
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

  // Submit selected groups registration to CRM
  const handleImportSelectedGroups = () => {
    if (!selectedSyncInstance || selectedJids.size === 0) {
      toast.error("Selecione pelo menos 1 grupo para registrar no CRM.");
      return;
    }

    const selectedGroupsObjects = remoteGroups.filter((g) => selectedJids.has(g.groupJid));

    syncInstanceGroups({
      instanceId: selectedSyncInstance,
      selectedJids: Array.from(selectedJids),
      groups: selectedGroupsObjects,
      targetFolderId: targetFolderIdForImport !== undefined ? targetFolderIdForImport : (selectedFolderId ?? null),
    });

    setSyncDialogOpen(false);
  };

  // Filter remote groups by search query and tab (all, new, registered)
  const filteredRemoteGroups = remoteGroups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(remoteSearch.toLowerCase()) ||
      g.groupJid.toLowerCase().includes(remoteSearch.toLowerCase());
    if (!matchesSearch) return false;

    const isAlreadyReg = registeredJidsSet.has(g.groupJid.toLowerCase().trim());
    if (remoteGroupFilterTab === "new") return !isAlreadyReg;
    if (remoteGroupFilterTab === "registered") return isAlreadyReg;
    return true;
  });

  const remoteNewCount = remoteGroups.filter(
    (g) => !registeredJidsSet.has(g.groupJid.toLowerCase().trim())
  ).length;
  const remoteAlreadyCount = remoteGroups.length - remoteNewCount;

  const selectedNewCount = Array.from(selectedJids).filter(
    (jid) => !registeredJidsSet.has(jid.toLowerCase().trim())
  ).length;
  const selectedExistingCount = selectedJids.size - selectedNewCount;

  const currentFolderName = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)?.name || "Pasta selecionada"
    : selectedFolderId === null
    ? "Sem pasta"
    : null;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <MessagesSquare className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Grupos</h1>
                <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-0.5 text-xs">
                  {selectedFolderId !== undefined
                    ? `${totalCount} na pasta (${globalTotalCount} no CRM)`
                    : `${totalCount} ${totalCount === 1 ? "grupo" : "grupos"}`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentFolderName
                  ? `Visualizando pasta: "${currentFolderName}". Grupos e leads registrados no CRM.`
                  : "Grupos e contatos salvos no CRM. Sincronização periódica e sob demanda."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Button to add & register groups from WhatsApp Connection */}
          <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Adicionar Grupos
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl w-full max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
              <DialogHeader className="p-6 pb-4 border-b border-border/70 bg-muted/20 shrink-0">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground">
                      Adicionar Grupos ao CRM
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                      Conecte-se à sua instância para listar os grupos do WhatsApp. O sistema identifica automaticamente grupos novos e existentes para registrar contatos e dados no CRM.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Step 1: Select Instance & Search Button */}
              <div className="p-6 pb-3 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3 bg-muted/30 p-3.5 rounded-xl border border-border/60">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5" /> Conexão do WhatsApp
                    </label>
                    <Select
                      value={selectedSyncInstance}
                      onValueChange={(val) => {
                        setSelectedSyncInstance(val);
                        setRemoteGroups([]);
                        setSelectedJids(new Set());
                        setRemoteSearch("");
                        setRemoteGroupFilterTab("all");
                      }}
                    >
                      <SelectTrigger className="h-10 text-xs bg-background border-border">
                        <SelectValue placeholder="Selecione uma conexão..." />
                      </SelectTrigger>
                      <SelectContent>
                        {instances?.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{i.name}</span>
                              {i.phone && <span className="text-muted-foreground text-[11px]">({i.phone})</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="default"
                    disabled={!selectedSyncInstance || isFetchingRemote}
                    onClick={handleFetchRemoteGroups}
                    className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0 shadow-sm"
                  >
                    {isFetchingRemote ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    {isFetchingRemote ? "Buscando..." : "Buscar Grupos da Conexão"}
                  </Button>
                </div>
              </div>

              {/* Step 2: List & Selectable Groups */}
              {remoteGroups.length > 0 ? (
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Search and Selection Toolbar */}
                  <div className="px-6 pb-3 shrink-0 space-y-2.5">
                    {/* Filter tabs: Todos, Novos, Já no CRM */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant={remoteGroupFilterTab === "all" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setRemoteGroupFilterTab("all")}
                          className="h-7 px-2.5 text-xs font-medium gap-1.5"
                        >
                          Todos
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {remoteGroups.length}
                          </Badge>
                        </Button>
                        <Button
                          type="button"
                          variant={remoteGroupFilterTab === "new" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setRemoteGroupFilterTab("new")}
                          className="h-7 px-2.5 text-xs font-medium gap-1.5 text-blue-600 dark:text-blue-400"
                        >
                          Novos
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold">
                            {remoteNewCount}
                          </Badge>
                        </Button>
                        <Button
                          type="button"
                          variant={remoteGroupFilterTab === "registered" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setRemoteGroupFilterTab("registered")}
                          className="h-7 px-2.5 text-xs font-medium gap-1.5 text-emerald-600 dark:text-emerald-400"
                        >
                          Já no CRM
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                            {remoteAlreadyCount}
                          </Badge>
                        </Button>
                      </div>

                      {/* Fast toggle buttons */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newJids = new Set<string>();
                            remoteGroups.forEach((g) => {
                              if (!registeredJidsSet.has(g.groupJid.toLowerCase().trim())) {
                                newJids.add(g.groupJid);
                              }
                            });
                            setSelectedJids(newJids);
                          }}
                          className="h-7 text-[11px] text-muted-foreground hover:text-foreground font-semibold"
                        >
                          Selecionar Novos ({remoteNewCount})
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJids(new Set(remoteGroups.map((g) => g.groupJid)))}
                          className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Todos
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJids(new Set())}
                          className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Limpar
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      {/* Search inside modal */}
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Filtrar por nome do grupo ou ID (@g.us)..."
                          value={remoteSearch}
                          onChange={(e) => setRemoteSearch(e.target.value)}
                          className="pl-9 pr-8 h-9 text-xs bg-background border-border"
                        />
                        {remoteSearch && (
                          <button
                            type="button"
                            onClick={() => setRemoteSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Folder selection dropdown for import */}
                      {folders.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <label className="text-[11px] text-muted-foreground whitespace-nowrap">
                            Pasta destino:
                          </label>
                          <Select
                            value={targetFolderIdForImport !== undefined ? (targetFolderIdForImport ?? "none") : (selectedFolderId ?? "none")}
                            onValueChange={(val) => setTargetFolderIdForImport(val === "none" ? null : val)}
                          >
                            <SelectTrigger className="h-9 text-xs w-[160px] bg-background">
                              <SelectValue placeholder="Selecione pasta..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem pasta (Geral)</SelectItem>
                              {folders.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  📁 {f.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scrollable list of selectable groups */}
                  <div className="flex-1 min-h-[260px] max-h-[380px] overflow-y-auto px-6 pb-4 space-y-2 scrollbar-thin">
                    {filteredRemoteGroups.length === 0 ? (
                      <div className="text-center py-10 text-xs text-muted-foreground">
                        Nenhum grupo encontrado com os filtros aplicados.
                      </div>
                    ) : (
                      filteredRemoteGroups.map((g) => {
                        const isChecked = selectedJids.has(g.groupJid);
                        const isAlreadyRegistered = registeredJidsSet.has(g.groupJid.toLowerCase().trim());
                        return (
                          <div
                            key={g.groupJid}
                            onClick={() => handleToggleSelectJid(g.groupJid)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm"
                                : isAlreadyRegistered
                                ? "bg-muted/20 border-border/40 opacity-85 hover:opacity-100 hover:bg-muted/40"
                                : "bg-card hover:bg-muted/40 border-border/70"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleToggleSelectJid(g.groupJid)}
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0"
                              />
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isAlreadyRegistered
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                <MessagesSquare className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-foreground truncate">{g.name}</p>
                                  {isAlreadyRegistered ? (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] py-0 px-1.5 h-4 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 gap-1 shrink-0 font-semibold"
                                    >
                                      <CheckCircle2 className="h-2.5 w-2.5" /> Já no CRM
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] py-0 px-1.5 h-4 bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shrink-0 font-semibold"
                                    >
                                      Novo
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] font-mono text-muted-foreground/90 truncate">{g.groupJid}</p>
                              </div>
                            </div>

                            <Badge variant="outline" className="text-[11px] font-medium gap-1 shrink-0 bg-background/80 py-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {g.participantsCount} {g.participantsCount === 1 ? "membro" : "membros"}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-6 pb-6">
                  <div className="text-center py-10 px-4 space-y-2 border border-dashed border-border/80 rounded-xl bg-muted/10">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                      <Radio className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">Nenhum grupo listado ainda</p>
                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                      Selecione a conexão do WhatsApp acima e clique em &ldquo;Buscar Grupos da Conexão&rdquo; para carregar os grupos participantes.
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="p-4 px-6 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-muted-foreground self-start sm:self-auto">
                  {selectedJids.size > 0 ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-foreground">
                        {selectedJids.size} {selectedJids.size === 1 ? "grupo selecionado" : "grupos selecionados"}
                      </span>
                      {selectedNewCount > 0 && selectedExistingCount > 0 && (
                        <span className="text-muted-foreground text-[11px]">
                          ({selectedNewCount} novos, {selectedExistingCount} já no CRM)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span>{remoteGroups.length > 0 ? `0 de ${remoteGroups.length} grupos selecionados` : "Nenhum grupo selecionado"}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button variant="outline" size="sm" onClick={() => setSyncDialogOpen(false)} className="text-xs">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    disabled={selectedJids.size === 0 || isSyncingInstance}
                    onClick={handleImportSelectedGroups}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                  >
                    {isSyncingInstance ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                    {isSyncingInstance
                      ? "Registrando no CRM..."
                      : selectedNewCount > 0 && selectedExistingCount > 0
                      ? `Registrar ${selectedNewCount} Novos (${selectedExistingCount} Atualizações) no CRM`
                      : selectedNewCount > 0
                      ? `Registrar ${selectedNewCount} ${selectedNewCount === 1 ? "Novo Grupo" : "Novos Grupos"} no CRM`
                      : `Atualizar ${selectedExistingCount} ${selectedExistingCount === 1 ? "Grupo" : "Grupos"} no CRM`}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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

      {/* Two Column Layout: Folder Sidebar on left + Groups content on right */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 items-start">
        {/* Sidebar com Pastas (igual aos Workflows) */}
        <aside className="w-full lg:w-64 shrink-0 bg-card border border-border/70 rounded-2xl p-3.5 shadow-sm">
          <GroupFolderTree
            folders={folders}
            countByFolder={countByFolder}
            uncategorizedCount={uncategorizedCount}
            totalCount={globalTotalCount}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(fId) => {
              setSelectedFolderId(fId);
              setPage(1);
            }}
            onCreateFolder={(name) => createFolder({ name })}
            onRenameFolder={(id, name) => renameFolder({ id, name })}
            onDeleteFolder={(id) => setFolderPendingDelete(id)}
            onReorder={reorderFolders}
            onDropGroup={(groupId, fId) => assignGroupToFolder({ groupId, folderId: fId })}
          />
        </aside>

        {/* Coluna Principal da Direita: Busca, Filtros e Lista de Grupos */}
        <div className="flex-1 min-w-0 w-full space-y-4">
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
                    folders={folders}
                    onOpenDetails={handleOpenDetails}
                    onMoveToFolder={(groupId, fId) => assignGroupToFolder({ groupId, folderId: fId })}
                    onRemoveFromCrm={(g) => setGroupPendingRemove(g)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                folders={folders}
                onOpenDetails={handleOpenDetails}
                onMoveToFolder={(groupId, fId) => assignGroupToFolder({ groupId, folderId: fId })}
                onRemoveFromCrm={(g) => setGroupPendingRemove(g)}
              />
            ))}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-card rounded-3xl border border-border p-8 space-y-4 shadow-sm">
          <div className="h-16 w-16 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <MessagesSquare className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-foreground">
              {selectedFolderId !== undefined
                ? `Nenhum grupo na pasta "${currentFolderName}"`
                : search.trim()
                ? "Nenhum grupo encontrado com este filtro"
                : "Nenhum grupo registrado no CRM ainda"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {selectedFolderId !== undefined
                ? "Esta pasta ainda não possui grupos associados. Você pode arrastar grupos para cá ou usar a opção Adicionar Grupos."
                : "Busque os grupos conectados ao WhatsApp e registre-os diretamente no seu CRM para gerenciar mensagens, membros e leads."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              onClick={() => setSyncDialogOpen(true)}
              className="text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Adicionar Grupos
            </Button>
            {selectedFolderId !== undefined && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFolderId(undefined)}
                className="text-xs font-semibold gap-2"
              >
                Ver todos os grupos ({globalTotalCount})
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
        </div>
      </div>

      {/* Delete Folder Dialog */}
      <Dialog open={!!folderPendingDelete} onOpenChange={(open) => !open && setFolderPendingDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Excluir pasta "{folders.find((f) => f.id === folderPendingDelete)?.name}"?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Os grupos contidos nesta pasta continuarão existindo normalmente no CRM, apenas ficarão "Sem pasta".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setFolderPendingDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (folderPendingDelete) {
                  await deleteFolder(folderPendingDelete);
                  if (selectedFolderId === folderPendingDelete) {
                    setSelectedFolderId(undefined);
                  }
                  setFolderPendingDelete(null);
                }
              }}
            >
              Excluir pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Group From CRM Confirmation Dialog */}
      <Dialog open={!!groupPendingRemove} onOpenChange={(open) => !open && setGroupPendingRemove(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Remover grupo do CRM?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              O grupo <strong>"{groupPendingRemove?.name}"</strong> deixará de ser monitorado no CRM e sairá de todas as pastas. Esta ação não apaga o grupo do seu WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button variant="outline" size="sm" onClick={() => setGroupPendingRemove(null)} disabled={isRemovingFromCrm}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isRemovingFromCrm}
              onClick={async () => {
                if (groupPendingRemove) {
                  await removeGroupFromCrmAsync({ groupId: groupPendingRemove.id, groupJid: groupPendingRemove.groupJid });
                  setGroupPendingRemove(null);
                  if (selectedGroup?.id === groupPendingRemove.id) {
                    setDrawerOpen(false);
                  }
                }
              }}
              className="gap-2 font-bold"
            >
              {isRemovingFromCrm ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {isRemovingFromCrm ? "Removendo..." : "Confirmar Remoção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Drawer */}
      <GroupDetailsDrawer
        group={selectedGroup}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRemoveFromCrm={(g) => setGroupPendingRemove(g)}
      />
    </div>
  );
}
