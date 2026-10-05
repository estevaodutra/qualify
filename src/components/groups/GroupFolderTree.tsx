import { useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Folder, FolderPlus, GripVertical, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { GroupFolder } from "@/hooks/useGroupFolders";

export const GROUP_DRAG_MIME = "application/x-group-id";

interface GroupFolderTreeProps {
  folders: GroupFolder[];
  countByFolder: Record<string, number>;
  uncategorizedCount: number;
  totalCount: number;
  selectedFolderId: string | null | undefined; // undefined = "Todos os grupos", null = "Sem pasta"
  onSelectFolder: (folderId: string | null | undefined) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  onDropGroup?: (groupId: string, folderId: string | null) => void;
}

function SortableFolderRow({
  folder,
  count,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onDropGroup,
}: {
  folder: GroupFolder;
  count: number;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDropGroup?: (groupId: string) => void;
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
        "flex items-center gap-2 rounded-xl px-2 py-2 group text-sm select-none transition-colors",
        isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/70 text-foreground/80",
        isDragging && "opacity-50",
        isDropTarget && "ring-2 ring-primary/40 bg-primary/10"
      )}
      onDragOver={(e) => {
        if (onDropGroup) {
          e.preventDefault();
          setIsDropTarget(true);
        }
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDropTarget(false);
        const groupId = e.dataTransfer.getData(GROUP_DRAG_MIME);
        if (groupId) onDropGroup?.(groupId);
      }}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/40 hover:text-foreground active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </span>
      <Folder className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-indigo-500")} />
      {isRenaming ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setIsRenaming(false);
          }}
          className="h-7 text-xs bg-background"
        />
      ) : (
        <button className="flex-1 text-left truncate text-xs font-medium" onClick={onSelect}>
          {folder.name}
        </button>
      )}
      <span className="text-xs text-muted-foreground/70 font-semibold px-1">{count}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onClick={() => {
              setIsRenaming(true);
              setName(folder.name);
            }}
            className="text-xs gap-2"
          >
            <Pencil className="h-3.5 w-3.5" /> Renomear
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-xs gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function GroupFolderTree({
  folders,
  countByFolder,
  uncategorizedCount,
  totalCount,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onReorder,
  onDropGroup,
}: GroupFolderTreeProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [uncategorizedDropTarget, setUncategorizedDropTarget] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = folders.findIndex((f) => f.id === active.id);
    const newIndex = folders.findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(folders, oldIndex, newIndex).map((f) => f.id));
    }
  };

  const commitCreate = () => {
    if (newName.trim()) onCreateFolder(newName.trim());
    setNewName("");
    setIsCreating(false);
  };

  return (
    <div className="space-y-1 w-full">
      {/* Todos os grupos */}
      <button
        className={cn(
          "w-full text-left rounded-xl px-2.5 py-2 text-xs flex items-center justify-between transition-colors",
          selectedFolderId === undefined ? "bg-primary/10 text-primary font-bold shadow-xs" : "hover:bg-muted/70 text-foreground/80 font-medium"
        )}
        onClick={() => onSelectFolder(undefined)}
      >
        <span>Todos os grupos</span>
        <span className="text-xs text-muted-foreground/70 font-semibold">{totalCount}</span>
      </button>

      {/* Sem pasta (drop target) */}
      <div
        className={cn(
          "rounded-xl transition-all",
          uncategorizedDropTarget && "ring-2 ring-primary/40 bg-primary/10"
        )}
        onDragOver={(e) => {
          if (onDropGroup) {
            e.preventDefault();
            setUncategorizedDropTarget(true);
          }
        }}
        onDragLeave={() => setUncategorizedDropTarget(false)}
        onDrop={(e) => {
          e.preventDefault();
          setUncategorizedDropTarget(false);
          const groupId = e.dataTransfer.getData(GROUP_DRAG_MIME);
          if (groupId) onDropGroup?.(groupId, null);
        }}
      >
        <button
          className={cn(
            "w-full text-left rounded-xl px-2.5 py-2 text-xs flex items-center justify-between transition-colors",
            selectedFolderId === null ? "bg-primary/10 text-primary font-bold shadow-xs" : "hover:bg-muted/70 text-foreground/80 font-medium"
          )}
          onClick={() => onSelectFolder(null)}
        >
          <span>Sem pasta</span>
          <span className="text-xs text-muted-foreground/70 font-semibold">{uncategorizedCount}</span>
        </button>
      </div>

      {/* Pastas Title & List */}
      <div className="pt-2.5">
        <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
          Pastas
        </p>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={folders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {folders.map((folder) => (
                <SortableFolderRow
                  key={folder.id}
                  folder={folder}
                  count={countByFolder[folder.id] || 0}
                  isSelected={selectedFolderId === folder.id}
                  onSelect={() => onSelectFolder(folder.id)}
                  onRename={(name) => onRenameFolder(folder.id, name)}
                  onDelete={() => onDeleteFolder(folder.id)}
                  onDropGroup={onDropGroup ? (groupId) => onDropGroup(groupId, folder.id) : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Nova pasta button / input */}
      {isCreating ? (
        <Input
          autoFocus
          placeholder="Nome da pasta"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={commitCreate}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitCreate();
            if (e.key === "Escape") setIsCreating(false);
          }}
          className="h-8 text-xs mt-1.5 bg-background"
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground text-xs font-semibold mt-1.5 hover:text-primary hover:bg-primary/5 rounded-xl"
          onClick={() => setIsCreating(true)}
        >
          <FolderPlus className="h-3.5 w-3.5 mr-2" /> Nova pasta
        </Button>
      )}
    </div>
  );
}
