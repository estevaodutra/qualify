import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dispatch/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWallet, useUpdateWalletSettings } from "@/hooks/useWallet";
import { useCompany } from "@/contexts/CompanyContext";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function WalletSettingsPage() {
  const wallet = useWallet();
  const { isAdmin } = useCompany();
  const update = useUpdateWalletSettings();

  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertValue, setAlertValue] = useState<string>("50");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [limitValue, setLimitValue] = useState<string>("100");
  const [limitAction, setLimitAction] = useState<"block" | "alert">("block");

  useEffect(() => {
    if (!wallet.data) return;
    setAlertEnabled((wallet.data.low_balance_alert ?? 0) > 0);
    setAlertValue(String(wallet.data.low_balance_alert ?? 50));
    setEmailEnabled(wallet.data.alert_email_enabled);
    setInAppEnabled(wallet.data.alert_in_app_enabled);
    setLimitEnabled(wallet.data.daily_limit !== null);
    setLimitValue(String(wallet.data.daily_limit ?? 100));
    setLimitAction((wallet.data.daily_limit_action as any) || "block");
  }, [wallet.data]);

  async function handleSave() {
    try {
      await update.mutateAsync({
        low_balance_alert: alertEnabled ? Number(alertValue) : 0,
        alert_email_enabled: emailEnabled,
        alert_in_app_enabled: inAppEnabled,
        daily_limit: limitEnabled ? Number(limitValue) : null,
        daily_limit_action: limitAction,
      });
      toast({ title: "Configurações salvas" });
    } catch (e) {
      toast({ title: "Erro ao salvar", description: (e as Error).message, variant: "destructive" });
    }
  }

  const disabled = !isAdmin;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações da carteira"
        description={disabled ? "Apenas administradores podem alterar" : "Alertas e limites de consumo"}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/carteira"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
        }
      />

      <Card className="space-y-4 p-6">
        <h3 className="font-semibold">Alertas de saldo baixo</h3>
        <div className="flex items-center justify-between">
          <Label htmlFor="alert-enabled">Ativar alertas</Label>
          <Switch id="alert-enabled" checked={alertEnabled} onCheckedChange={setAlertEnabled} disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="alert-value">Valor mínimo (R$)</Label>
          <Input id="alert-value" type="number" min={0} value={alertValue} onChange={(e) => setAlertValue(e.target.value)} disabled={disabled || !alertEnabled} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="email-enabled">Enviar por e-mail</Label>
          <Switch id="email-enabled" checked={emailEnabled} onCheckedChange={setEmailEnabled} disabled={disabled || !alertEnabled} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="inapp-enabled">Notificação no sistema</Label>
          <Switch id="inapp-enabled" checked={inAppEnabled} onCheckedChange={setInAppEnabled} disabled={disabled || !alertEnabled} />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h3 className="font-semibold">Limite diário de consumo</h3>
        <div className="flex items-center justify-between">
          <Label htmlFor="limit-enabled">Ativar limite diário</Label>
          <Switch id="limit-enabled" checked={limitEnabled} onCheckedChange={setLimitEnabled} disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="limit-value">Limite diário (R$)</Label>
          <Input id="limit-value" type="number" min={0} value={limitValue} onChange={(e) => setLimitValue(e.target.value)} disabled={disabled || !limitEnabled} />
        </div>
        <div className="space-y-2">
          <Label>Ao atingir o limite</Label>
          <RadioGroup value={limitAction} onValueChange={(v) => setLimitAction(v as any)} disabled={disabled || !limitEnabled}>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="block" value="block" />
              <Label htmlFor="block" className="font-normal">Bloquear novas ações</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="alert" value="alert" />
              <Label htmlFor="alert" className="font-normal">Apenas alertar</Label>
            </div>
          </RadioGroup>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={disabled || update.isPending}>
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}
