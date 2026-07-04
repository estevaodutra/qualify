import { useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Folder, FolderPlus, GripVertical, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { WorkflowFolder } from "@/hooks/useWorkflowFolders";

interface FolderTreeProps {
  folders: WorkflowFolder[];
  countByFolder: Record<string, number>;
  uncategorizedCount: number;
  selectedFolderId: string | null | undefined; // undefined = "Todas", null = "Sem pasta"
  onSelectFolder: (folderId: string | null | undefined) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onDropWorkflow?: (workflowId: string, folderId: string | null) => void;
}

const WORKFLOW_DRAG_MIME = "application/x-workflow-id";

function SortableFolderRow({
  folder,
  count,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onDropWorkflow,
}: {
  folder: WorkflowFolder;
  count: number;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDropWorkflow?: (workflowId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(folder.name);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const commitRename = () => {
    setIsRenaming(false);
    if (name.trim() && name !== folder.name) onRename(name.trim());
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-2 group text-sm",
        isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted",
        isDragging && "opacity-50",
        isDropTarget && "ring-2 ring-primary/40 bg-primary/5"
      )}
      onDragOver={(e) => { if (onDropWorkflow) { e.preventDefault(); setIsDropTarget(true); } }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDropTarget(false);
        const workflowId = e.dataTransfer.getData(WORKFLOW_DRAG_MIME);
        if (workflowId) onDropWorkflow?.(workflowId);
      }}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-muted-foreground/50 hover:text-foreground" onClick={(e) => e.stopPropagation()}>
        <GripVertical className="w-3.5 h-3.5" />
      </span>
      <Folder className="w-4 h-4 shrink-0" />
      {isRenaming ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setIsRenaming(false); }}
          className="h-7 text-sm"
        />
      ) : (
        <button className="flex-1 text-left truncate" onClick={onSelect}>{folder.name}</button>
      )}
      <span className="text-xs text-muted-foreground/60">{count}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsRenaming(true)}><Pencil className="h-3.5 w-3.5 mr-2" /> Renomear</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FolderTree({
  folders, countByFolder, uncategorizedCount, selectedFolderId, onSelectFolder,
  onCreateFolder, onRenameFolder, onDeleteFolder, onReorder, onDropWorkflow,
}: FolderTreeProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [uncategorizedDropTarget, setUncategorizedDropTarget] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = folders.findIndex((f) => f.id === active.id);
    const newIndex = folders.findIndex((f) => f.id === over.id);
    onReorder(arrayMove(folders, oldIndex, newIndex).map((f) => f.id));
  };

  const commitCreate = () => {
    if (newName.trim()) onCreateFolder(newName.trim());
    setNewName("");
    setIsCreating(false);
  };

  return (
    <div className="space-y-1 w-full">
      <button
        className={cn(
          "w-full text-left rounded-lg px-2 py-2 text-sm",
          selectedFolderId === undefined ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
        )}
        onClick={() => onSelectFolder(undefined)}
      >
        Todas as automações
      </button>
      <div
        className={cn(
          "rounded-lg",
          uncategorizedDropTarget && "ring-2 ring-primary/40 bg-primary/5"
        )}
        onDragOver={(e) => { if (onDropWorkflow) { e.preventDefault(); setUncategorizedDropTarget(true); } }}
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
            "w-full text-left rounded-lg px-2 py-2 text-sm flex items-center justify-between",
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
            {folders.map((folder) => (
              <SortableFolderRow
                key={folder.id}
                folder={folder}
                count={countByFolder[folder.id] || 0}
                isSelected={selectedFolderId === folder.id}
                onSelect={() => onSelectFolder(folder.id)}
                onRename={(name) => onRenameFolder(folder.id, name)}
                onDelete={() => onDeleteFolder(folder.id)}
                onDropWorkflow={onDropWorkflow ? (workflowId) => onDropWorkflow(workflowId, folder.id) : undefined}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {isCreating ? (
        <Input
          autoFocus
          placeholder="Nome da pasta"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={commitCreate}
          onKeyDown={(e) => { if (e.key === "Enter") commitCreate(); if (e.key === "Escape") setIsCreating(false); }}
          className="h-8 text-sm mt-1"
        />
      ) : (
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground mt-1" onClick={() => setIsCreating(true)}>
          <FolderPlus className="h-3.5 w-3.5 mr-2" /> Nova pasta
        </Button>
      )}
    </div>
  );
}
