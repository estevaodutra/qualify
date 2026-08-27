import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/types/crm.types";

interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "remove";
  leads: Lead[];
  selectedIds: Set<string>;
  availableTags?: string[];
  onSubmit: (tags: string[]) => void;
  isLoading?: boolean;
}

export function BulkTagDialog({ open, onOpenChange, mode, leads, selectedIds, availableTags = [], onSubmit, isLoading }: BulkTagDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const existingTags = useMemo(() => {
    const tagSet = new Set<string>();

    // 1. System available tags passed via prop
    if (Array.isArray(availableTags)) {
      availableTags.forEach((t) => {
        if (t) tagSet.add(t);
      });
    }

    // 2. Tags from localStorage fallback
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith("qualify_tags_")) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                if (item?.name) tagSet.add(item.name);
              });
            }
          }
        }
      });
    } catch (_e) {}

    // 3. Tags from current leads
    leads.forEach((l) => {
      if (Array.isArray(l.tags)) {
        l.tags.forEach((t) => {
          if (t) tagSet.add(t);
        });
      }
    });

    return Array.from(tagSet).sort();
  }, [leads, availableTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const addNewTag = () => {
    const tag = tagInput.trim();
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
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-y-auto pr-1">
                {existingTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer transition-all"
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
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Nome da nova tag..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addNewTag();
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={addNewTag}>
                  +
                </Button>
              </div>
            </div>
          )}

          {selectedTags.length > 0 && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Selecionadas para {mode === "add" ? "adicionar" : "remover"}:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedTags.map((tag) => (
                  <Badge key={tag} className="bg-primary/20 text-primary border-primary/30">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={selectedTags.length === 0 || isLoading}>
            {isLoading ? "Processando..." : mode === "add" ? "Adicionar" : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
