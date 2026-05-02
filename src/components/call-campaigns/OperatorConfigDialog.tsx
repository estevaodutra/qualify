import { useState } from "react";
import { CallOperator } from "@/hooks/useCallOperators";
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
import { User } from "lucide-react";

interface OperatorConfigDialogProps {
  operator: CallOperator | null;
  campaignIntervalSeconds: number;
  onClose: () => void;
  onSave: (params: { id: string; personalIntervalSeconds: number | null }) => Promise<void>;
}

const quickIntervals = [15, 30, 45, 60, 90, 120];

export function OperatorConfigDialog({ operator, campaignIntervalSeconds, onClose, onSave }: OperatorConfigDialogProps) {
  const [mode, setMode] = useState<"default" | "custom">(
    operator?.personalIntervalSeconds ? "custom" : "default"
  );
  const [customInterval, setCustomInterval] = useState(
    operator?.personalIntervalSeconds ?? campaignIntervalSeconds
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!operator) return;
    setSaving(true);
    try {
      await onSave({
        id: operator.id,
        personalIntervalSeconds: mode === "custom" ? customInterval : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!operator} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Operador</DialogTitle>
        </DialogHeader>

        {operator && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{operator.operatorName}</span>
              {operator.extension && (
                <span className="text-muted-foreground">• Ramal: {operator.extension}</span>
              )}
            </div>

            <div className="space-y-3">
              <Label>Intervalo entre Ligações</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as "default" | "custom")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="default" />
                  <Label htmlFor="default" className="font-normal cursor-pointer">
                    Usar padrão da campanha ({campaignIntervalSeconds} segundos)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="font-normal cursor-pointer">
                    Personalizado
                  </Label>
                </div>
              </RadioGroup>

              {mode === "custom" && (
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
