import { useState, useEffect } from "react";
import { CallOperator, useCallOperators } from "@/hooks/useCallOperators";
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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";
import { format } from "date-fns";

const quickIntervals = [15, 30, 45, 60, 90, 120];

interface EditOperatorDialogProps {
  operator: CallOperator | null;
  onClose: () => void;
}

export function EditOperatorDialog({ operator, onClose }: EditOperatorDialogProps) {
  const { updateOperator } = useCallOperators();
  const [name, setName] = useState("");
  const [extension, setExtension] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [intervalMode, setIntervalMode] = useState<"default" | "custom">("default");
  const [customInterval, setCustomInterval] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (operator) {
      setName(operator.operatorName);
      setExtension(operator.extension || "");
      setIsActive(operator.isActive);
      setIntervalMode(operator.personalIntervalSeconds ? "custom" : "default");
      setCustomInterval(operator.personalIntervalSeconds ?? 30);
    }
  }, [operator]);

  const handleSave = async () => {
    if (!operator || !name.trim()) return;
    setSaving(true);
    try {
      await updateOperator({
        id: operator.id,
        updates: {
          operatorName: name.trim(),
          extension: extension.trim(),
          isActive,
          personalIntervalSeconds: intervalMode === "custom" ? customInterval : null,
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const answerRate = operator && operator.totalCalls > 0
    ? ((operator.totalCallsAnswered / operator.totalCalls) * 100).toFixed(1)
    : null;

  return (
    <Dialog open={!!operator} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Operador</DialogTitle>
        </DialogHeader>

        {operator && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Nome *</Label>
              <Input id="editName" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editExt">Ramal/Extensão *</Label>
              <Input id="editExt" value={extension} onChange={(e) => setExtension(e.target.value)} />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Cooldown (Intervalo entre Ligações)</Label>
              <p className="text-xs text-muted-foreground">
                Tempo de descanso obrigatório entre chamadas. O operador fica indisponível durante este período após cada ligação.
              </p>

              {operator.status === "cooldown" && operator.lastCallEndedAt && (() => {
                const intervalSec = intervalMode === "custom" ? customInterval : 30;
                const elapsed = Math.floor((Date.now() - new Date(operator.lastCallEndedAt!).getTime()) / 1000);
                const remaining = Math.max(0, intervalSec - elapsed);
                return remaining > 0 ? (
                  <Badge variant="secondary" className="gap-1 w-fit">
                    <Timer className="h-3 w-3" />
                    Em cooldown — {remaining}s restantes
                  </Badge>
                ) : null;
              })()}
              <RadioGroup value={intervalMode} onValueChange={(v) => setIntervalMode(v as "default" | "custom")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="editDefault" />
                  <Label htmlFor="editDefault" className="font-normal cursor-pointer">
                    Usar padrão das campanhas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="editCustom" />
                  <Label htmlFor="editCustom" className="font-normal cursor-pointer">
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

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Operador ativo</Label>
                <p className="text-xs text-muted-foreground">Operadores inativos não participam das campanhas</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <Separator />

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">📊 Estatísticas</Label>
              <div className="text-sm space-y-0.5">
                <p>Total de ligações: {operator.totalCalls}</p>
                <p>Ligações atendidas: {operator.totalCallsAnswered}{answerRate && ` (${answerRate}%)`}</p>
                {operator.lastCallEndedAt && (
                  <p>Última ligação: {format(new Date(operator.lastCallEndedAt), "dd/MM/yyyy HH:mm")}</p>
                )}
                <p>Cadastrado em: {format(new Date(operator.createdAt), "dd/MM/yyyy")}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
