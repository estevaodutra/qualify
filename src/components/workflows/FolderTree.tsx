import { useState, useMemo, useEffect } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Folder,
  FolderPlus,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronRight,
  FolderInput,
  CornerDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { WorkflowFolder } from "@/hooks/useWorkflowFolders";
import { buildFolderTree, type FolderNode } from "@/lib/workflowFolderHierarchy";
import { MoveFolderDialog } from "./MoveFolderDialog";

interface FolderTreeProps {
  folders: WorkflowFolder[];
  countByFolder: Record<string, number>;
  uncategorizedCount: number;
  selectedFolderId: string | null | undefined; // undefined = "Todas", null = "Sem pasta"
  onSelectFolder: (folderId: string | null | undefined) => void;
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveFolder?: (id: string, parentId: string | null) => Promise<void>;
  onReorder: (orderedIds: string[]) => void;
  onDropWorkflow?: (workflowId: string, folderId: string | null) => void;
}

const WORKFLOW_DRAG_MIME = "application/x-workflow-id";

interface FolderTreeItemProps {
  node: FolderNode;
  countByFolder: Record<string, number>;
  selectedFolderId: string | null | undefined;
  expandedMap: Record<string, boolean>;
  onToggleExpand: (folderId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onStartCreateSubfolder: (folderId: string) => void;
  onOpenMoveDialog: (folder: WorkflowFolder) => void;
  onMoveToRoot: (folderId: string) => void;
  onDropWorkflow?: (workflowId: string, folderId: string) => void;
  creatingSubfolderOf: string | null;
  onCommitSubfolder: (name: string, parentId: string) => void;
  onCancelSubfolder: () => void;
}

function FolderTreeItem({
  node,
  countByFolder,
  selectedFolderId,
  expandedMap,
  onToggleExpand,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
  onStartCreateSubfolder,
  onOpenMoveDialog,
  onMoveToRoot,
  onDropWorkflow,
  creatingSubfolderOf,
  onCommitSubfolder,
  onCancelSubfolder,
}: FolderTreeItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(node.name);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [subfolderName, setSubfolderName] = useState("");

  const count = countByFolder[node.id] || 0;
  const isSelected = selectedFolderId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedMap[node.id] ?? true;

  // Keep internal name in sync when prop changes
  useEffect(() => {
    setName(node.name);
  }, [node.name]);

  const commitRename = () => {
    setIsRenaming(false);
    if (name.trim() && name.trim() !== node.name) {
      onRenameFolder(node.id, name.trim());
    } else {
      setName(node.name);
    }
  };

  const handleSubfolderSubmit = () => {
    if (subfolderName.trim()) {
      onCommitSubfolder(subfolderName.trim(), node.id);
    }
    setSubfolderName("");
  };

  return (
    <div className="flex flex-col">
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2 py-1.5 group text-sm transition-colors cursor-pointer",
          isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/70",
          isDragging && "opacity-50",
          isDropTarget && "ring-2 ring-primary/40 bg-primary/5"
        )}
        onClick={() => onSelectFolder(node.id)}
        onDragOver={(e) => {
          if (onDropWorkflow) {
            e.preventDefault();
            setIsDropTarget(true);
          }
        }}
        onDragLeave={() => setIsDropTarget(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDropTarget(false);
          const workflowId = e.dataTransfer.getData(WORKFLOW_DRAG_MIME);
          if (workflowId) onDropWorkflow?.(workflowId, node.id);
        }}
      >
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground/40 hover:text-foreground shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </span>

        {/* Expand / collapse chevron */}
        {hasChildren ? (
          <button
            type="button"
            className="p-0.5 rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
          >
            <ChevronRight
              className={cn("w-3.5 h-3.5 transition-transform duration-150", isExpanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}

        <Folder className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground/70")} />

        {isRenaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setName(node.name);
                setIsRenaming(false);
              }
            }}
            className="h-7 text-xs bg-background"
          />
        ) : (
          <span className="flex-1 text-left truncate text-xs font-medium">
            {node.name}
          </span>
        )}

        <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">{count}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onStartCreateSubfolder(node.id)}>
              <FolderPlus className="h-3.5 w-3.5 mr-2 text-primary" /> Nova subpasta
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5 mr-2" /> Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenMoveDialog(node)}>
              <FolderInput className="h-3.5 w-3.5 mr-2" /> Mover pasta...
            </DropdownMenuItem>
            {node.parentId && (
              <DropdownMenuItem onClick={() => onMoveToRoot(node.id)}>
                <CornerDownLeft className="h-3.5 w-3.5 mr-2" /> Mover para raiz
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDeleteFolder(node.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children list */}
      {isExpanded && (hasChildren || creatingSubfolderOf === node.id) && (
        <div className="pl-3.5 ml-3 border-l border-border/40 mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              countByFolder={countByFolder}
              selectedFolderId={selectedFolderId}
              expandedMap={expandedMap}
              onToggleExpand={onToggleExpand}
              onSelectFolder={onSelectFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onStartCreateSubfolder={onStartCreateSubfolder}
              onOpenMoveDialog={onOpenMoveDialog}
              onMoveToRoot={onMoveToRoot}
              onDropWorkflow={onDropWorkflow}
              creatingSubfolderOf={creatingSubfolderOf}
              onCommitSubfolder={onCommitSubfolder}
              onCancelSubfolder={onCancelSubfolder}
            />
          ))}

          {creatingSubfolderOf === node.id && (
            <div className="flex items-center gap-1.5 py-1 px-2" onClick={(e) => e.stopPropagation()}>
              <FolderPlus className="w-3.5 h-3.5 text-primary shrink-0" />
              <Input
                autoFocus
                placeholder="Nome da subpasta"
                value={subfolderName}
                onChange={(e) => setSubfolderName(e.target.value)}
                onBlur={handleSubfolderSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubfolderSubmit();
                  if (e.key === "Escape") onCancelSubfolder();
                }}
                className="h-7 text-xs bg-background"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  countByFolder,
  uncategorizedCount,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onReorder,
  onDropWorkflow,
}: FolderTreeProps) {
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [newRootName, setNewRootName] = useState("");
  const [creatingSubfolderOf, setCreatingSubfolderOf] = useState<string | null>(null);
  const [movingFolder, setMovingFolder] = useState<WorkflowFolder | null>(null);
  const [uncategorizedDropTarget, setUncategorizedDropTarget] = useState(false);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const toggleExpand = (folderId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [folderId]: !(prev[folderId] ?? true),
    }));
  };

  const handleStartCreateSubfolder = (parentId: string) => {
    // Ensure parent is expanded
    setExpandedMap((prev) => ({ ...prev, [parentId]: true }));
    setCreatingSubfolderOf(parentId);
  };

  const handleCommitSubfolder = (name: string, parentId: string) => {
    if (name.trim()) {
      onCreateFolder(name.trim(), parentId);
    }
    setCreatingSubfolderOf(null);
  };

  const commitCreateRoot = () => {
    if (newRootName.trim()) onCreateFolder(newRootName.trim(), null);
    setNewRootName("");
    setIsCreatingRoot(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = folders.findIndex((f) => f.id === active.id);
    const newIndex = folders.findIndex((f) => f.id === over.id);
    onReorder(arrayMove(folders, oldIndex, newIndex).map((f) => f.id));
  };

  const handleMoveConfirm = async (folderId: string, targetParentId: string | null) => {
    if (onMoveFolder) {
      await onMoveFolder(folderId, targetParentId);
    }
  };

  return (
    <div className="space-y-1 w-full">
      <button
        className={cn(
          "w-full text-left rounded-lg px-2 py-2 text-sm transition-colors",
          selectedFolderId === undefined ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
        )}
        onClick={() => onSelectFolder(undefined)}
      >
        Todas as automações
      </button>

      <div
        className={cn(
          "rounded-lg transition-colors",
          uncategorizedDropTarget && "ring-2 ring-primary/40 bg-primary/5"
        )}
        onDragOver={(e) => {
          if (onDropWorkflow) {
            e.preventDefault();
            setUncategorizedDropTarget(true);
          }
        }}
        onDragLeave={() => setUncategorizedDropTarget(false)}
        onDrop={(e) => {
          e.preventDefault();
          setUncategorizedDropTarget(false);
          const workflowId = e.dataTransfer.getData(WORKFLOW_DRAG_MIME);
          if (workflowId) onDropWorkflow?.(workflowId, null);
        }}
      >
        <button
          className={cn(
            "w-full text-left rounded-lg px-2 py-2 text-sm flex items-center justify-between transition-colors",
            selectedFolderId === null ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
          )}
          onClick={() => onSelectFolder(null)}
        >
          <span>Sem pasta</span>
          <span className="text-xs text-muted-foreground/60">{uncategorizedCount}</span>
        </button>
      </div>

      <div className="pt-2">
        <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Pastas</p>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={folders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {folderTree.map((rootNode) => (
                <FolderTreeItem
                  key={rootNode.id}
                  node={rootNode}
                  countByFolder={countByFolder}
                  selectedFolderId={selectedFolderId}
                  expandedMap={expandedMap}
                  onToggleExpand={toggleExpand}
                  onSelectFolder={onSelectFolder}
                  onRenameFolder={onRenameFolder}
                  onDeleteFolder={onDeleteFolder}
                  onStartCreateSubfolder={handleStartCreateSubfolder}
                  onOpenMoveDialog={setMovingFolder}
                  onMoveToRoot={(id) => onMoveFolder?.(id, null)}
                  onDropWorkflow={onDropWorkflow ? (workflowId, folderId) => onDropWorkflow(workflowId, folderId) : undefined}
                  creatingSubfolderOf={creatingSubfolderOf}
                  onCommitSubfolder={handleCommitSubfolder}
                  onCancelSubfolder={() => setCreatingSubfolderOf(null)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {isCreatingRoot ? (
        <Input
          autoFocus
          placeholder="Nome da pasta"
          value={newRootName}
          onChange={(e) => setNewRootName(e.target.value)}
          onBlur={commitCreateRoot}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitCreateRoot();
            if (e.key === "Escape") setIsCreatingRoot(false);
          }}
          className="h-8 text-sm mt-1"
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground mt-1 hover:text-foreground"
          onClick={() => setIsCreatingRoot(true)}
        >
          <FolderPlus className="h-3.5 w-3.5 mr-2" /> Nova pasta
        </Button>
      )}

      {/* Move Folder Dialog */}
      <MoveFolderDialog
        folder={movingFolder}
        folders={folders}
        open={!!movingFolder}
        onOpenChange={(open) => {
          if (!open) setMovingFolder(null);
        }}
        onConfirm={handleMoveConfirm}
      />
    </div>
  );
}
