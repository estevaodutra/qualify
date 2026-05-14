import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, slug: string) => Promise<void>;
  isLoading?: boolean;
}

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateFunnelDialog({ open, onClose, onCreate, isLoading }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugManual) setSlug(toSlug(v));
  };

  const handleSlugChange = (v: string) => {
    setSlug(toSlug(v));
    setSlugManual(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    await onCreate(name.trim(), slug.trim());
    setName("");
    setSlug("");
    setSlugManual(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar novo funil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="funnel-name">Nome do funil</Label>
            <Input
              id="funnel-name"
              placeholder="Ex: Funil de qualificação"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="funnel-slug">URL do funil</Label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">/q/</span>
              <Input
                id="funnel-slug"
                placeholder="meu-funil"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name || !slug || isLoading}>
            {isLoading ? "Criando..." : "Criar funil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
