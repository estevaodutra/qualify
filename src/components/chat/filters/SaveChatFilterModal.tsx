import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark, Sparkles } from "lucide-react";

interface SaveChatFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onSave: (name: string) => Promise<void>;
  isSubmitting?: boolean;
}

export default function SaveChatFilterModal({
  open,
  onOpenChange,
  initialName = "",
  onSave,
  isSubmitting = false,
}: SaveChatFilterModalProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave(name.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border border-border/60 rounded-2xl shadow-2xl z-[10000]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            {initialName ? "Renomear Filtro Salvo" : "Salvar Combinação de Filtros"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Dê um nome para reaplicar estas regras operacionais com 1 clique no futuro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="saved-filter-name" className="text-xs font-semibold">
              Nome da visão/predefinição
            </Label>
            <Input
              id="saved-filter-name"
              placeholder="Ex: Propostas Quentes VIP, Aguardando Atendimento..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs rounded-xl"
              autoFocus
              required
            />
          </div>

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
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Salvar Predefinição
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
