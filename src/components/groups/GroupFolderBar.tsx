import React, { useState } from "react";
import { Folder, FolderPlus, MoreVertical, Pencil, Trash2, Check, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { GroupFolder } from "@/hooks/useGroupFolders";

interface GroupFolderBarProps {
  folders: GroupFolder[];
  selectedFolderId: string | null | undefined;
  onSelectFolder: (folderId: string | null | undefined) => void;
  countByFolder: Record<string, number>;
  totalCount: number;
  uncategorizedCount: number;
  onCreateFolder: (name: string) => Promise<any>;
  onRenameFolder: (id: string, name: string) => Promise<any>;
  onDeleteFolder: (id: string) => Promise<any>;
}

export const GroupFolderBar: React.FC<GroupFolderBarProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  countByFolder,
  totalCount,
  uncategorizedCount,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingFolder, setDeletingFolder] = useState<GroupFolder | null>(null);

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;
    try {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreating(false);
    } catch {
      // error handled in hook
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) {
      setEditingFolderId(null);
      return;
    }
    try {
      await onRenameFolder(id, editName.trim());
      setEditingFolderId(null);
    } catch {
      // error handled in hook
    }
  };

  const handleDelete = async () => {
    if (!deletingFolder) return;
    try {
      await onDeleteFolder(deletingFolder.id);
      if (selectedFolderId === deletingFolder.id) {
        onSelectFolder(undefined);
      }
      setDeletingFolder(null);
    } catch {
      // error handled in hook
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin w-full">
      {/* Tab: Todos os grupos */}
      <button
        onClick={() => onSelectFolder(undefined)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border",
          selectedFolderId === undefined
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : "bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border/70"
        )}
      >
        <Layers className="h-3.5 w-3.5" />
        <span>Todos</span>
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] px-1.5 py-0 h-4 min-w-[18px] text-center font-bold",
            selectedFolderId === undefined
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {totalCount}
        </Badge>
      </button>

      {/* Tab: Sem pasta */}
      <button
        onClick={() => onSelectFolder(null)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border",
          selectedFolderId === null
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : "bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border/70"
        )}
      >
        <Folder className="h-3.5 w-3.5" />
        <span>Sem Pasta</span>
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] px-1.5 py-0 h-4 min-w-[18px] text-center font-bold",
            selectedFolderId === null
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {uncategorizedCount}
        </Badge>
      </button>

      {/* Custom Folders */}
      {folders.map((folder) => {
        const isSelected = selectedFolderId === folder.id;
        const count = countByFolder[folder.id] || 0;
        const isEditing = editingFolderId === folder.id;

        if (isEditing) {
          return (
            <div
              key={folder.id}
              className="flex items-center gap-1 bg-card border border-primary/50 px-2 py-1 rounded-xl shrink-0 shadow-sm"
            >
              <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
              <Input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(folder.id);
                  if (e.key === "Escape") setEditingFolderId(null);
                }}
                className="h-6 text-xs w-28 px-1.5 py-0"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={() => handleRename(folder.id)}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground"
                onClick={() => setEditingFolderId(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        }

        return (
          <div
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            className={cn(
              "group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border cursor-pointer select-none",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border/70"
            )}
          >
            <Folder className={cn("h-3.5 w-3.5", isSelected ? "text-primary-foreground" : "text-indigo-500")} />
            <span className="truncate max-w-[140px]">{folder.name}</span>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 min-w-[18px] text-center font-bold",
                isSelected
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {count}
            </Badge>

            {/* Folder Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button
                  className={cn(
                    "p-0.5 rounded hover:bg-black/10 transition-opacity ml-0.5",
                    isSelected ? "opacity-90 hover:opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  title="Opções da pasta"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolderId(folder.id);
                    setEditName(folder.name);
                  }}
                  className="text-xs gap-2"
                >
                  <Pencil className="h-3 w-3" /> Renomear
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingFolder(folder);
                  }}
                  className="text-xs gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}

      {/* Inline Create Folder or Button */}
      {isCreating ? (
        <div className="flex items-center gap-1 bg-card border border-primary/50 px-2 py-1 rounded-xl shrink-0 shadow-sm">
          <FolderPlus className="h-3.5 w-3.5 text-primary shrink-0" />
          <Input
            autoFocus
            placeholder="Nome da pasta..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewFolderName("");
              }
            }}
            className="h-6 text-xs w-32 px-1.5 py-0"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={handleCreate}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => {
              setIsCreating(false);
              setNewFolderName("");
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-xl shrink-0 border-dashed border-border/80 text-muted-foreground hover:text-primary hover:border-primary/50"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span>Nova Pasta</span>
        </Button>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingFolder} onOpenChange={(open) => !open && setDeletingFolder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Excluir pasta "{deletingFolder?.name}"?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Os grupos contidos nesta pasta continuarão existindo normalmente na sua conta, apenas ficarão "Sem pasta".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingFolder(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Excluir pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
