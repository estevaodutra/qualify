import { useMemo, useState } from "react";
import { Workflow, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkflowFolders } from "@/hooks/useWorkflowFolders";
import { useWorkflowDefinitions, type WorkflowStatus } from "@/hooks/useWorkflowDefinitions";
import { FolderTree } from "@/components/workflows/FolderTree";
import { WorkflowCard } from "@/components/workflows/WorkflowCard";
import { DeleteFolderDialog } from "@/components/workflows/DeleteFolderDialog";
import { NewWorkflowDialog } from "@/components/workflows/NewWorkflowDialog";

const STATUS_TABS: { value: WorkflowStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "draft", label: "Rascunhos" },
  { value: "paused", label: "Pausadas" },
  { value: "error", label: "Com erro" },
];

export default function WorkflowLibrary() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);
  const [statusTab, setStatusTab] = useState<WorkflowStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [folderPendingDelete, setFolderPendingDelete] = useState<string | null>(null);

  const { folders, isLoading: loadingFolders, createFolder, renameFolder, reorderFolders, deleteFolder } = useWorkflowFolders();
  const { definitions: allDefinitions, isLoading: loadingDefinitions, moveToFolder } = useWorkflowDefinitions();

  const countByFolder = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const def of allDefinitions) {
      if (def.folderId) counts[def.folderId] = (counts[def.folderId] || 0) + 1;
    }
    return counts;
  }, [allDefinitions]);

  const uncategorizedCount = useMemo(
    () => allDefinitions.filter((d) => !d.folderId).length,
    [allDefinitions]
  );

  const visibleDefinitions = useMemo(() => {
    return allDefinitions.filter((def) => {
      if (selectedFolderId === null && def.folderId) return false;
      if (typeof selectedFolderId === "string" && def.folderId !== selectedFolderId) return false;
      if (statusTab !== "all" && def.status !== statusTab) return false;
      if (search && !def.name.toLowerCase().includes(search.toLowerCase()) && !(def.description || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allDefinitions, selectedFolderId, statusTab, search]);

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
              onCreateFolder={(name) => createFolder({ name })}
              onRenameFolder={(id, name) => renameFolder({ id, name })}
              onDeleteFolder={setFolderPendingDelete}
              onReorder={reorderFolders}
              onDropWorkflow={(workflowId, folderId) => moveToFolder({ id: workflowId, folderId })}
            />
          )}
        </aside>

        <div className="flex-1 min-w-0 space-y-4">
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

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
            </div>
          ) : visibleDefinitions.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-border/40 bg-muted/10 p-16 text-center">
              <Workflow className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-1">Nenhuma automação encontrada</h3>
              <p className="text-sm text-muted-foreground/60 mb-6">Crie sua primeira automação para começar.</p>
              <Button onClick={() => setShowNewDialog(true)} className="rounded-xl gradient-primary glow-primary font-bold">
                <Plus className="mr-2 h-4 w-4" /> Nova automação
              </Button>
            </div>
          ) : (
            <div
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              onDragOver={(e) => e.preventDefault()}
            >
              {visibleDefinitions.map((def) => (
                <div
                  key={def.id}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <WorkflowCard
                    workflow={def}
                    folders={folders}
                    onMoveToFolder={(folderId) => moveToFolder({ id: def.id, folderId })}
                  />
                </div>
              ))}
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
    </div>
  );
}
