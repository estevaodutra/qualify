import { useMemo, useState } from "react";
import { Workflow, Plus, Search, Folder, FolderPlus, ChevronRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useWorkflowFolders } from "@/hooks/useWorkflowFolders";
import { useWorkflowDefinitions, type WorkflowStatus } from "@/hooks/useWorkflowDefinitions";
import { FolderTree } from "@/components/workflows/FolderTree";
import { WorkflowCard } from "@/components/workflows/WorkflowCard";
import { DeleteFolderDialog } from "@/components/workflows/DeleteFolderDialog";
import { DeleteWorkflowDialog } from "@/components/workflows/DeleteWorkflowDialog";
import { NewWorkflowDialog } from "@/components/workflows/NewWorkflowDialog";
import { getFolderAndDescendantIds } from "@/lib/workflowFolderHierarchy";

const STATUS_TABS: { value: WorkflowStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "draft", label: "Rascunhos" },
  { value: "paused", label: "Pausadas" },
  { value: "error", label: "Com erro" },
];

export default function WorkflowLibrary() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [statusTab, setStatusTab] = useState<WorkflowStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [folderPendingDelete, setFolderPendingDelete] = useState<string | null>(null);
  const [workflowPendingDelete, setWorkflowPendingDelete] = useState<any | null>(null);

  const {
    folders,
    isLoading: loadingFolders,
    createFolder,
    renameFolder,
    moveFolder,
    reorderFolders,
    deleteFolder,
  } = useWorkflowFolders();
  const {
    definitions: allDefinitions,
    isLoading: loadingDefinitions,
    moveToFolder,
    updateStatus,
    deleteWorkflowDefinition,
    duplicateWorkflowDefinition,
  } = useWorkflowDefinitions();

  const directCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const def of allDefinitions) {
      if (def.folderId) counts[def.folderId] = (counts[def.folderId] || 0) + 1;
    }
    return counts;
  }, [allDefinitions]);

  const countByFolder = useMemo(() => {
    const totalCounts: Record<string, number> = {};
    for (const f of folders) {
      const descendantIds = getFolderAndDescendantIds(f.id, folders);
      totalCounts[f.id] = descendantIds.reduce((sum, id) => sum + (directCounts[id] || 0), 0);
    }
    return totalCounts;
  }, [allDefinitions, folders, directCounts]);

  const uncategorizedCount = useMemo(
    () => allDefinitions.filter((d) => !d.folderId).length,
    [allDefinitions]
  );

  const folderMap = useMemo(() => {
    const map = new Map<string, typeof folders[0]>();
    for (const f of folders) map.set(f.id, f);
    return map;
  }, [folders]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId || typeof selectedFolderId !== "string") return null;
    return folderMap.get(selectedFolderId) || null;
  }, [folderMap, selectedFolderId]);

  const folderPath = useMemo(() => {
    if (!selectedFolder) return [];
    const path: typeof folders = [];
    let curr: typeof folders[0] | undefined = selectedFolder;
    const visited = new Set<string>();
    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      path.unshift(curr);
      curr = curr.parentId ? folderMap.get(curr.parentId) : undefined;
    }
    return path;
  }, [selectedFolder, folderMap]);

  const currentSubfolders = useMemo(() => {
    if (typeof selectedFolderId !== "string") return [];
    return folders.filter((f) => f.parentId === selectedFolderId);
  }, [folders, selectedFolderId]);

  const visibleDefinitions = useMemo(() => {
    return allDefinitions.filter((def) => {
      if (selectedFolderId === null && def.folderId) return false;
      if (typeof selectedFolderId === "string") {
        if (includeSubfolders) {
          const folderIds = getFolderAndDescendantIds(selectedFolderId, folders);
          if (!def.folderId || !folderIds.includes(def.folderId)) return false;
        } else {
          if (def.folderId !== selectedFolderId) return false;
        }
      }
      if (statusTab !== "all" && def.status !== statusTab) return false;
      if (search && !def.name.toLowerCase().includes(search.toLowerCase()) && !(def.description || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allDefinitions, selectedFolderId, folders, includeSubfolders, statusTab, search]);

  const folderPendingDeleteObj = folders.find((f) => f.id === folderPendingDelete);

  const isLoading = loadingFolders || loadingDefinitions;

  return (
    <div className="flex flex-col gap-6 p-8 overflow-y-auto flex-1 min-h-0 bg-background/50 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight m-0 font-['Sora'] flex items-center gap-2">
            <Workflow className="h-5 w-5 text-[#8A3CFF]" />
            Workflows
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Sua biblioteca de automações, organizada em pastas livres.
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="h-11 px-6 rounded-xl gradient-primary glow-primary font-bold shadow-lg">
          <Plus className="mr-2 h-4.5 w-4.5" /> Nova automação
        </Button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <aside className="w-64 shrink-0 hidden lg:block">
          {loadingFolders ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <FolderTree
              folders={folders}
              countByFolder={countByFolder}
              uncategorizedCount={uncategorizedCount}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={(name, parentId) => createFolder({ name, parentId })}
              onRenameFolder={(id, name) => renameFolder({ id, name })}
              onMoveFolder={(id, parentId) => moveFolder({ id, parentId })}
              onDeleteFolder={setFolderPendingDelete}
              onReorder={reorderFolders}
              onDropWorkflow={(workflowId, folderId) => moveToFolder({ id: workflowId, folderId })}
            />
          )}
        </aside>

        <div className="flex-1 min-w-0 space-y-5">
          {/* Breadcrumb da pasta selecionada */}
          {selectedFolderId !== undefined && (
            <div className="flex items-center justify-between gap-3 text-xs bg-muted/20 border border-border/40 rounded-xl px-3.5 py-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-muted-foreground flex-wrap">
                <button
                  onClick={() => setSelectedFolderId(undefined)}
                  className="hover:text-primary transition-colors font-medium flex items-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Todas as automações
                </button>
                {selectedFolderId === null ? (
                  <>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                    <span className="font-bold text-foreground">Sem pasta</span>
                  </>
                ) : (
                  folderPath.map((f, idx) => {
                    const isLast = idx === folderPath.length - 1;
                    return (
                      <span key={f.id} className="flex items-center gap-1.5">
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                        {isLast ? (
                          <span className="font-bold text-foreground flex items-center gap-1">
                            <Folder className="h-3.5 w-3.5 text-primary" />
                            {f.name}
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedFolderId(f.id)}
                            className="hover:text-primary transition-colors font-medium"
                          >
                            {f.name}
                          </button>
                        )}
                      </span>
                    );
                  })
                )}
              </div>

              {typeof selectedFolderId === "string" && (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {visibleDefinitions.length} {visibleDefinitions.length === 1 ? "automação" : "automações"}
                </span>
              )}
            </div>
          )}

          {/* Barra de Filtros e Busca */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Buscar automações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-10 rounded-xl border-border/40 bg-background/50"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {typeof selectedFolderId === "string" && currentSubfolders.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-xl border border-border/40">
                  <Switch
                    id="include-subfolders-toggle"
                    checked={includeSubfolders}
                    onCheckedChange={setIncludeSubfolders}
                    className="scale-75"
                  />
                  <Label htmlFor="include-subfolders-toggle" className="text-xs text-muted-foreground cursor-pointer select-none font-medium">
                    Incluir subpastas
                  </Label>
                </div>
              )}
              <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusTab(tab.value)}
                    className={cn(
                      "px-3 h-8 rounded-lg text-xs font-semibold transition-colors",
                      statusTab === tab.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Seção de Subpastas */}
          {currentSubfolders.length > 0 && (
            <div className="space-y-3 pb-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-[#8A3CFF]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Subpastas ({currentSubfolders.length})
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => createFolder({ name: "Nova subpasta", parentId: selectedFolderId as string })}
                  className="h-7 text-xs rounded-lg gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-primary" /> Nova subpasta
                </Button>
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {currentSubfolders.map((subfolder) => {
                  const count = countByFolder[subfolder.id] || 0;
                  return (
                    <div
                      key={subfolder.id}
                      onClick={() => setSelectedFolderId(subfolder.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("ring-2", "ring-primary", "bg-primary/5");
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove("ring-2", "ring-primary", "bg-primary/5");
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("ring-2", "ring-primary", "bg-primary/5");
                        const workflowId = e.dataTransfer.getData("application/x-workflow-id");
                        if (workflowId) moveToFolder({ id: workflowId, folderId: subfolder.id });
                      }}
                      className="group flex items-center justify-between p-3.5 rounded-2xl border border-border/40 bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-elevation-sm transition-all cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0">
                          <Folder className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {subfolder.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {count} {count === 1 ? "automação" : "automações"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid de Automações */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
            </div>
          ) : visibleDefinitions.length === 0 ? (
            currentSubfolders.length > 0 ? (
              <div className="rounded-2xl border border-dashed border-border/40 bg-muted/10 p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-foreground">Esta pasta não possui automações na raiz</p>
                <p className="text-xs text-muted-foreground">
                  As automações estão organizadas nas {currentSubfolders.length} {currentSubfolders.length === 1 ? "subpasta" : "subpastas"} listadas acima.
                </p>
                {!includeSubfolders && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIncludeSubfolders(true)}
                    className="text-xs rounded-xl mt-2 font-medium"
                  >
                    Ver automações das subpastas
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-border/40 bg-muted/10 p-16 text-center">
                <Workflow className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-1">Nenhuma automação encontrada</h3>
                <p className="text-sm text-muted-foreground/60 mb-6">Crie sua primeira automação para começar.</p>
                <Button onClick={() => setShowNewDialog(true)} className="rounded-xl gradient-primary glow-primary font-bold">
                  <Plus className="mr-2 h-4 w-4" /> Nova automação
                </Button>
              </div>
            )
          ) : (
            <div
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              onDragOver={(e) => e.preventDefault()}
            >
              {visibleDefinitions.map((def) => {
                const isFromSubfolder = typeof selectedFolderId === "string" && def.folderId && def.folderId !== selectedFolderId;
                const subfolderName = isFromSubfolder ? folderMap.get(def.folderId!)?.name : undefined;
                return (
                  <div
                    key={def.id}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <WorkflowCard
                      workflow={def}
                      folders={folders}
                      folderName={subfolderName}
                      onMoveToFolder={(folderId) => moveToFolder({ id: def.id, folderId })}
                      onDelete={() => setWorkflowPendingDelete(def)}
                      onDuplicate={() => duplicateWorkflowDefinition(def.id)}
                      onToggleActive={(active) =>
                        updateStatus({ id: def.id, status: active ? "active" : "paused" })
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <NewWorkflowDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        defaultFolderId={typeof selectedFolderId === "string" ? selectedFolderId : null}
      />

      {folderPendingDeleteObj && (
        <DeleteFolderDialog
          open={!!folderPendingDelete}
          onOpenChange={(open) => !open && setFolderPendingDelete(null)}
          folderName={folderPendingDeleteObj.name}
          automationCount={countByFolder[folderPendingDeleteObj.id] || 0}
          onConfirm={(mode) => deleteFolder({ id: folderPendingDeleteObj.id, mode })}
        />
      )}

      {workflowPendingDelete && (
        <DeleteWorkflowDialog
          open={!!workflowPendingDelete}
          onOpenChange={(open) => !open && setWorkflowPendingDelete(null)}
          workflowName={workflowPendingDelete.name}
          onConfirm={() => deleteWorkflowDefinition(workflowPendingDelete.id)}
        />
      )}
    </div>
  );
}
