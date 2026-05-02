import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { AlertTriangle } from "lucide-react";

interface AddToQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSubmit: (campaignId: string, position: "end" | "start") => void;
  isLoading?: boolean;
}

export function AddToQueueDialog({ open, onOpenChange, selectedCount, onSubmit, isLoading }: AddToQueueDialogProps) {
  const [campaignId, setCampaignId] = useState("");
  const [position, setPosition] = useState<"end" | "start">("end");
  const { campaigns } = useCallCampaigns();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar à Fila de Ligação</DialogTitle>
          <DialogDescription>{selectedCount} leads selecionados</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Campanha de Ligação *</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Posição na fila</Label>
            <RadioGroup value={position} onValueChange={(v) => setPosition(v as "end" | "start")} className="mt-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="end" id="end" />
                <label htmlFor="end" className="text-sm">Adicionar ao final da fila</label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="start" id="start" />
                <label htmlFor="start" className="text-sm">Adicionar ao início da fila</label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Leads já na fila serão ignorados
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSubmit(campaignId, position)} disabled={!campaignId || isLoading}>
            {isLoading ? "Adicionando..." : "Adicionar à Fila"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
