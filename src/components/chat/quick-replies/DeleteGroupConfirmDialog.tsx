import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickReplyGroup } from "@/types/quickReplyTypes";
import { AlertTriangle } from "lucide-react";

interface DeleteGroupConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupToDelete: QuickReplyGroup | null;
  otherGroups: QuickReplyGroup[];
  replyCount: number;
  onConfirmDelete: (targetGroupId: string | null) => Promise<void>;
  isSubmitting?: boolean;
}

export default function DeleteGroupConfirmDialog({
  open,
  onOpenChange,
  groupToDelete,
  otherGroups,
  replyCount,
  onConfirmDelete,
  isSubmitting = false,
}: DeleteGroupConfirmDialogProps) {
  const [actionChoice, setActionChoice] = useState<"none" | "other">("none");
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);

  if (!groupToDelete) return null;

  const handleConfirm = async () => {
    const finalTarget = actionChoice === "other" ? targetGroupId : null;
    await onConfirmDelete(finalTarget);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Excluir grupo "{groupToDelete.name}"?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            {replyCount > 0
              ? `Este grupo possui ${replyCount} ${replyCount === 1 ? 'resposta rápida' : 'respostas rápidas'}. Escolha o que fazer com elas antes de excluir.`
              : "Tem certeza que deseja excluir este grupo?"}
          </DialogDescription>
        </DialogHeader>

        {replyCount > 0 && (
          <div className="space-y-3 py-2 border-y border-border/40 my-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name="group-delete-action"
                  checked={actionChoice === "none"}
                  onChange={() => setActionChoice("none")}
                  className="accent-primary"
                />
                <span>Mover respostas para <strong>Sem grupo</strong></span>
              </label>

              {otherGroups.length > 0 && (
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="group-delete-action"
                    checked={actionChoice === "other"}
                    onChange={() => {
                      setActionChoice("other");
                      if (!targetGroupId && otherGroups.length > 0) {
                        setTargetGroupId(otherGroups[0].id);
                      }
                    }}
                    className="accent-primary"
                  />
                  <span>Mover respostas para outro grupo:</span>
                </label>
              )}
            </div>

            {actionChoice === "other" && otherGroups.length > 0 && (
              <div className="pl-6 pt-1">
                <Select
                  value={targetGroupId || otherGroups[0]?.id}
                  onValueChange={(val) => setTargetGroupId(val)}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue placeholder="Selecione o grupo destino" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {otherGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color || "#10B981" }} />
                          {g.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="rounded-xl text-xs font-bold"
          >
            Excluir Grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
