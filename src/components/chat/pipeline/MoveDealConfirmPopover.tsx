import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PipelineStage } from "@/types/crm.types";
import { ArrowRight, AlertCircle, Loader2 } from "lucide-react";

interface MoveDealConfirmPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineName: string;
  currentStage: PipelineStage | null;
  targetStage: PipelineStage | null;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export default function MoveDealConfirmPopover({
  open,
  onOpenChange,
  pipelineName,
  currentStage,
  targetStage,
  onConfirm,
  isSubmitting = false,
}: MoveDealConfirmPopoverProps) {
  if (!targetStage) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-primary" /> Mover Negócio?
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            Confirme a alteração de etapa na pipeline <strong>{pipelineName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-2 my-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: currentStage?.color || "#94a3b8" }} />
              <span className="truncate text-muted-foreground">{currentStage?.name || "Atual"}</span>
            </div>

            <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 px-0.5" />

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: targetStage.color || "#3b82f6" }} />
              <span className="truncate text-foreground font-bold">{targetStage.name}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs h-8"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-xl text-xs font-bold h-8 bg-primary text-primary-foreground shadow-sm"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
