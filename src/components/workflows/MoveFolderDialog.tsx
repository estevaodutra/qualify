import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkflowFolder } from "@/hooks/useWorkflowFolders";
import { buildFolderTree, flattenFolderTree, isDescendantOf } from "@/lib/workflowFolderHierarchy";
import { Folder } from "lucide-react";

interface MoveFolderDialogProps {
  folder: WorkflowFolder | null;
  folders: WorkflowFolder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folderId: string, targetParentId: string | null) => Promise<void>;
}

const ROOT_VALUE = "__root__";

export function MoveFolderDialog({
  folder,
  folders,
  open,
  onOpenChange,
  onConfirm,
}: MoveFolderDialogProps) {
  const [targetParentId, setTargetParentId] = useState<string>(ROOT_VALUE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Eligible folders to move into (cannot move into itself or its descendants)
  const eligibleFolders = useMemo(() => {
    if (!folder) return [];
    const tree = buildFolderTree(folders);
    const flat = flattenFolderTree(tree);
    return flat.filter(
      (f) => f.id !== folder.id && !isDescendantOf(folder.id, f.id, folders)
    );
  }, [folder, folders]);

  // Set initial selected parent whenever dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && folder) {
      setTargetParentId(folder.parentId || ROOT_VALUE);
    }
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    if (!folder) return;
    try {
      setIsSubmitting(true);
      const newParentId = targetParentId === ROOT_VALUE ? null : targetParentId;
      await onConfirm(folder.id, newParentId);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!folder) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            Mover pasta
          </DialogTitle>
          <DialogDescription>
            Escolha para onde deseja mover a pasta <strong>{folder.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pasta de destino
            </Label>
            <Select value={targetParentId} onValueChange={setTargetParentId}>
              <SelectTrigger className="h-10 rounded-xl bg-background/50 border-border/40">
                <SelectValue placeholder="Selecione o destino" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ROOT_VALUE}>
                  📁 Pasta principal (Nível raiz)
                </SelectItem>
                {eligibleFolders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {"\u00A0\u00A0".repeat(f.depth)}
                    {f.depth > 0 ? "↳ 📁 " : "📁 "}
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="gradient-primary glow-primary font-bold"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Movendo..." : "Salvar alteração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
