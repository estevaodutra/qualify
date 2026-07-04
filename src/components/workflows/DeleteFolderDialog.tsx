import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  automationCount: number;
  onConfirm: (mode: "move_to_uncategorized" | "delete_all") => void;
}

export function DeleteFolderDialog({ open, onOpenChange, folderName, automationCount, onConfirm }: DeleteFolderDialogProps) {
  const [mode, setMode] = useState<"move_to_uncategorized" | "delete_all">("move_to_uncategorized");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Excluir pasta "{folderName}"?</DialogTitle>
          <DialogDescription>
            {automationCount > 0
              ? `Esta pasta contém ${automationCount} automação(ões). O que deseja fazer com elas?`
              : "Esta pasta está vazia."}
          </DialogDescription>
        </DialogHeader>

        {automationCount > 0 && (
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="space-y-2">
            <label className="flex items-start gap-3 rounded-xl border border-border/40 p-3 cursor-pointer">
              <RadioGroupItem value="move_to_uncategorized" className="mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Mover para "Sem pasta"</p>
                <p className="text-xs text-muted-foreground">As automações continuam existindo, apenas ficam sem pasta.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border/40 p-3 cursor-pointer">
              <RadioGroupItem value="delete_all" className="mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Excluir as automações também</p>
                <p className="text-xs text-muted-foreground">Remove essas automações da biblioteca.</p>
              </div>
            </label>
          </RadioGroup>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(mode); onOpenChange(false); }}
          >
            Excluir pasta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
