import { useState } from "react";
import { useCallOperators } from "@/hooks/useCallOperators";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

const quickIntervals = [15, 30, 45, 60, 90, 120];

interface CreateOperatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOperatorDialog({ open, onOpenChange }: CreateOperatorDialogProps) {
  const { addOperator, isAdding } = useCallOperators();
  const [name, setName] = useState("");
  const [extension, setExtension] = useState("");
  const [intervalMode, setIntervalMode] = useState<"default" | "custom">("default");
  const [customInterval, setCustomInterval] = useState(30);

  const handleSave = async () => {
    if (!name.trim() || !extension.trim()) return;
    await addOperator({
      operatorName: name.trim(),
      extension: extension.trim(),
      personalIntervalSeconds: intervalMode === "custom" ? customInterval : null,
    });
    setName("");
    setExtension("");
    setIntervalMode("default");
    setCustomInterval(30);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Operador</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="opName">Nome *</Label>
            <Input
              id="opName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João Silva"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="opExtension">Ramal/Extensão *</Label>
            <Input
              id="opExtension"
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
              placeholder="Ex: 1001"
            />
            <p className="text-xs text-muted-foreground">
              ℹ️ O ramal deve corresponder à extensão configurada no sistema de telefonia (API4com).
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Intervalo entre Ligações</Label>
            <RadioGroup value={intervalMode} onValueChange={(v) => setIntervalMode(v as "default" | "custom")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="intDefault" />
                <Label htmlFor="intDefault" className="font-normal cursor-pointer">
                  Usar padrão das campanhas
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="intCustom" />
                <Label htmlFor="intCustom" className="font-normal cursor-pointer">
                  Personalizado
                </Label>
              </div>
            </RadioGroup>

            {intervalMode === "custom" && (
              <div className="space-y-2 ml-6">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={customInterval}
                    onChange={(e) => setCustomInterval(Number(e.target.value) || 30)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">segundos</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickIntervals.map((v) => (
                    <Button
                      key={v}
                      variant={customInterval === v ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCustomInterval(v)}
                    >
                      {v}s
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || !extension.trim() || isAdding}>
            {isAdding ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
