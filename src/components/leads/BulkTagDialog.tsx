import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/hooks/useLeads";

interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "remove";
  leads: Lead[];
  selectedIds: Set<string>;
  onSubmit: (tags: string[]) => void;
  isLoading?: boolean;
}

export function BulkTagDialog({ open, onOpenChange, mode, leads, selectedIds, onSubmit, isLoading }: BulkTagDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const existingTags = useMemo(() => {
    const tagSet = new Set<string>();
    leads.forEach(l => {
      if (selectedIds.has(l.id)) {
        (l.tags || []).forEach(t => tagSet.add(t));
      }
    });
    // Also include all tags from all leads for suggestions
    leads.forEach(l => (l.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [leads, selectedIds]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addNewTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setTagInput("");
  };

  const handleSubmit = () => {
    if (selectedTags.length === 0) return;
    onSubmit(selectedTags);
    setSelectedTags([]);
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Adicionar Tag" : "Remover Tag"}</DialogTitle>
          <DialogDescription>
            {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""} selecionado{selectedIds.size !== 1 ? "s" : ""}{" "}
            {mode === "add" ? "receberão" : "terão removida(s)"} a(s) tag(s) escolhida(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {existingTags.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Tags existentes</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {existingTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {mode === "add" && (
            <div>
              <Label className="text-sm font-medium">Ou criar nova tag</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="Nome da nova tag..."
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNewTag(); } }}
                />
                <Button variant="outline" size="sm" onClick={addNewTag}>+</Button>
              </div>
            </div>
          )}

          {selectedTags.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground">Selecionadas: {selectedTags.join(", ")}</Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={selectedTags.length === 0 || isLoading}>
            {isLoading ? "Processando..." : mode === "add" ? "Adicionar" : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
