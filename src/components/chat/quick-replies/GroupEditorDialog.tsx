import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { QuickReplyGroup, QUICK_REPLY_GROUP_COLORS } from "@/types/quickReplyTypes";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface GroupEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupToEdit?: QuickReplyGroup | null;
  onSave: (data: { name: string; color: string; active?: boolean }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function GroupEditorDialog({
  open,
  onOpenChange,
  groupToEdit,
  onSave,
  isSubmitting = false,
}: GroupEditorDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10B981");
  const [customColor, setCustomColor] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name || "");
      setActive(groupToEdit.active !== false);
      const groupColor = groupToEdit.color || "#10B981";
      setColor(groupColor);
      if (!QUICK_REPLY_GROUP_COLORS.some(c => c.value === groupColor)) {
        setCustomColor(groupColor);
      } else {
        setCustomColor("");
      }
    } else {
      setName("");
      setActive(true);
      setColor("#10B981");
      setCustomColor("");
    }
  }, [groupToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalColor = customColor.trim() || color;
    await onSave({ name: name.trim(), color: finalColor, active });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {groupToEdit ? "Editar Grupo" : "Novo Grupo"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Organize suas respostas rápidas em categorias visuais por cores.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Group Name */}
          <div className="space-y-1.5">
            <Label htmlFor="group-name" className="text-xs font-semibold">
              Nome do grupo
            </Label>
            <Input
              id="group-name"
              placeholder="Ex: Venda, Recuperação, Suporte..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs rounded-xl"
              required
            />
          </div>

          {/* Color Palette */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Cor de acento visual</Label>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_REPLY_GROUP_COLORS.map((item) => {
                const isSelected = color === item.value && !customColor;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setColor(item.value);
                      setCustomColor("");
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/50 hover:bg-muted/40"
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.value }}
                    />
                    <span className="truncate text-[11px]">{item.name}</span>
                    {isSelected && <Check className="h-3 w-3 text-primary ml-auto" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Hex Color */}
            <div className="pt-2 flex items-center gap-2">
              <Input
                type="color"
                value={customColor || color}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setColor(e.target.value);
                }}
                className="h-8 w-12 p-0.5 rounded-lg cursor-pointer shrink-0"
              />
              <Input
                placeholder="Cor personalizada (Hex #...)"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  if (e.target.value) setColor(e.target.value);
                }}
                className="text-xs rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Group Active Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/20 border border-border/40 rounded-2xl">
            <div className="space-y-0.5">
              <Label htmlFor="group-active-toggle" className="text-xs font-bold cursor-pointer">
                Exibir na barra lateral do Chat
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Se desativado, o grupo e suas respostas serão ocultados do painel operacional.
              </p>
            </div>
            <Switch
              id="group-active-toggle"
              checked={active}
              onCheckedChange={setActive}
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
              className="rounded-xl text-xs font-bold"
            >
              {groupToEdit ? "Salvar Alterações" : "Criar Grupo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
