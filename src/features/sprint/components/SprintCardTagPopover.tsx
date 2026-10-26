import React, { useState, useMemo } from "react";
import { SprintCard, SprintLabel } from "../types";
import { useSprintStore } from "../state/sprintStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, Plus, Check, Search, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  { name: "Vermelho", hex: "#EF4444" },
  { name: "Laranja", hex: "#F97316" },
  { name: "Âmbar", hex: "#F59E0B" },
  { name: "Verde", hex: "#10B981" },
  { name: "Ciano", hex: "#06B6D4" },
  { name: "Azul", hex: "#3B82F6" },
  { name: "Índigo", hex: "#6366F1" },
  { name: "Roxo", hex: "#8B5CF6" },
  { name: "Rosa", hex: "#EC4899" },
  { name: "Grafite", hex: "#64748B" },
];

interface SprintCardTagPopoverProps {
  card: SprintCard;
  className?: string;
  trigger?: React.ReactNode;
}

export const SprintCardTagPopover: React.FC<SprintCardTagPopoverProps> = ({
  card,
  className,
  trigger,
}) => {
  const { labels, toggleCardLabel, createLabel } = useSprintStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[5].hex);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtra as etiquetas pelo texto de busca
  const filteredLabels = useMemo(() => {
    if (!search.trim()) return labels;
    const q = search.toLowerCase();
    return labels.filter((l) => l.name.toLowerCase().includes(q));
  }, [labels, search]);

  const isLabelAttached = (labelId: string) => {
    return (card.labels || []).some((l) => l.id === labelId);
  };

  const handleToggleLabel = async (label: SprintLabel) => {
    await toggleCardLabel(card.id, label);
  };

  const handleCreateAndAttach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const created = await createLabel(newTagName.trim(), selectedColor);
      if (created) {
        await toggleCardLabel(card.id, created);
        setNewTagName("");
        setIsCreating(false);
        setSearch("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsOpen((prev) => !prev);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 bg-card/90 backdrop-blur-xs border border-transparent hover:border-primary/20 cursor-pointer shadow-2xs transition-all",
              isOpen && "opacity-100 bg-primary/10 text-primary border-primary/30",
              className
            )}
            title="Adicionar ou Criar Etiqueta (Tag)"
          >
            <Tag className="h-3.5 w-3.5" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-64 p-3 bg-popover border border-border text-popover-foreground shadow-2xl rounded-xl z-[9999]"
      >
        {!isCreating ? (
          /* Modo Seleção de Etiquetas */
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-border/50">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <span>Etiquetas</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                {(card.labels || []).length} selecionada(s)
              </span>
            </div>

            {/* Campo de Busca Rápida */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar etiquetas..."
                className="h-7 text-xs pl-8 bg-muted/30 border-border/60"
                autoFocus
              />
            </div>

            {/* Lista de Etiquetas Existentes */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {filteredLabels.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  Nenhuma etiqueta encontrada.
                </div>
              ) : (
                filteredLabels.map((label) => {
                  const attached = isLabelAttached(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => handleToggleLabel(label)}
                      style={{ backgroundColor: label.color }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer text-left hover:brightness-105",
                        attached && "ring-2 ring-foreground/40 shadow-sm"
                      )}
                    >
                      <span className="truncate pr-2">{label.name}</span>
                      <div className="h-4 w-4 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                        {attached && <Check className="h-3 w-3 text-white stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Botão para Criar Nova Tag */}
            <div className="pt-1.5 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreating(true);
                  setNewTagName(search.trim());
                }}
                className="w-full h-8 text-xs font-medium justify-center gap-1.5 border-dashed hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Criar nova etiqueta</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Modo Criação de Nova Etiqueta */
          <form onSubmit={handleCreateAndAttach} className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/50">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar</span>
              </button>
              <span className="text-xs font-bold text-foreground">Nova Etiqueta</span>
            </div>

            {/* Nome da Tag */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Nome da tag</label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Ex: Urgente, Bug, Criativo..."
                className="h-8 text-xs bg-background"
                autoFocus
              />
            </div>

            {/* Paleta de Cores */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Escolha a cor</label>
              <div className="grid grid-cols-5 gap-1.5 p-1 bg-muted/20 rounded-lg border border-border/50">
                {PRESET_COLORS.map((c) => {
                  const isSelected = selectedColor === c.hex;
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={cn(
                        "h-6 w-full rounded-md transition-transform hover:scale-105 flex items-center justify-center shadow-2xs cursor-pointer",
                        isSelected && "ring-2 ring-offset-1 ring-foreground scale-105"
                      )}
                      title={c.name}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pré-visualização da Tag */}
            {newTagName.trim() && (
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Prévia no cartão:</label>
                <div
                  style={{ backgroundColor: selectedColor }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white shadow-2xs truncate text-center"
                >
                  {newTagName}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={!newTagName.trim() || isSubmitting}
                className="flex-1 h-8 text-xs font-medium"
              >
                {isSubmitting ? "Criando..." : "Criar e Vincular"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
};
