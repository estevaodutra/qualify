import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { billingStore } from "@/services/billing/billingStore";
import { TrialSettings, TrialEndAction } from "@/services/billing/types";
import {
  Timer,
  Save,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function AdminPlanTrial() {
  const { toast } = useToast();
  const [trialSettings, setTrialSettings] = useState<TrialSettings>(() =>
    billingStore.getTrialSettings()
  );
  const [isSaving, setIsSaving] = useState(false);

  // Subscriptions currently trialing
  const subscriptions = billingStore.getSubscriptions();
  const trialingSubs = subscriptions.filter((s) => s.status === "trialing");

  const handleSaveSettings = () => {
    setIsSaving(true);
    try {
      const updated = billingStore.saveTrialSettings(trialSettings, "Super Admin");
      setTrialSettings(updated);
      toast({
        title: "Regras de Trial salvas!",
        description: `Trial de ${trialSettings.duration_days} dias configurado com ação: ${trialSettings.action_on_end}.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Regras de Trial &amp; Degustação</h1>
            <Badge variant="outline" className="text-xs">Onboarding de Clientes</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Defina o período gratuito para novas empresas, exigência de cartão e comportamento ao término do prazo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveSettings} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </div>
      </div>

      {/* KPIs de Trial */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Contas em Trial Ativo</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{trialingSubs.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Empresas degustando a plataforma</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Timer className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Duração Padrão</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {trialSettings.duration_days} dias
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Carência: {trialSettings.grace_period_days} dias extras</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Ação ao Término</p>
            <p className="text-base font-bold text-foreground mt-1 capitalize">
              {trialSettings.action_on_end === "require_payment"
                ? "Exigir Pagamento"
                : trialSettings.action_on_end === "activate_subscription_if_payment_method_exists"
                ? "Cobrar se Cartão Cadastrado"
                : trialSettings.action_on_end}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Sem cobrança automática não autorizada</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Editor de Trial */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Parâmetros Operacionais do Trial</CardTitle>
          <CardDescription className="text-xs">
            Configurações que regem o ciclo de vida do período de testes na criação de novas contas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Trial Ativo?</Label>
                <Switch
                  checked={trialSettings.enabled}
                  onCheckedChange={(checked) =>
                    setTrialSettings({ ...trialSettings, enabled: checked })
                  }
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Inicia contagem regressiva automaticamente ao cadastrar nova empresa.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Duração do Trial (Dias)</Label>
              <Input
                type="number"
                value={trialSettings.duration_days}
                onChange={(e) =>
                  setTrialSettings({
                    ...trialSettings,
                    duration_days: parseInt(e.target.value, 10) || 7,
                  })
                }
                className="h-9 font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">Padrão da plataforma: 7 dias.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Exigir Cartão no Cadastro?</Label>
              <Select
                value={trialSettings.require_payment_method ? "yes" : "no"}
                onValueChange={(val) =>
                  setTrialSettings({ ...trialSettings, require_payment_method: val === "yes" })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Não (Acesso livre no trial)</SelectItem>
                  <SelectItem value="yes">Sim (Exige validação do cartão)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Reduz fricção de entrada se 'Não'.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Período de Carência (Grace)</Label>
              <Select
                value={String(trialSettings.grace_period_days)}
                onValueChange={(val) =>
                  setTrialSettings({
                    ...trialSettings,
                    grace_period_days: parseInt(val, 10),
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 dias (Bloqueio imediato)</SelectItem>
                  <SelectItem value="1">1 dia de tolerância</SelectItem>
                  <SelectItem value="3">3 dias de tolerância (Recomendado)</SelectItem>
                  <SelectItem value="5">5 dias de tolerância</SelectItem>
                  <SelectItem value="7">7 dias de tolerância</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Dias extras antes da suspensão total.</p>
            </div>
          </div>

          <div className="pt-2">
            <Label className="text-xs font-medium">Comportamento ao Finalizar o Trial</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
              <div
                onClick={() =>
                  setTrialSettings({ ...trialSettings, action_on_end: "require_payment" })
                }
                className={`p-3 rounded-lg border cursor-pointer transition-colors text-xs ${
                  trialSettings.action_on_end === "require_payment"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <p className="font-semibold text-foreground">Exigir Pagamento (Padrão)</p>
                <p className="text-[11px] mt-1 leading-relaxed">
                  Bloqueia novas ações na plataforma até que o cliente adicione forma de pagamento e ative o plano.
                </p>
              </div>

              <div
                onClick={() =>
                  setTrialSettings({
                    ...trialSettings,
                    action_on_end: "activate_subscription_if_payment_method_exists",
                  })
                }
                className={`p-3 rounded-lg border cursor-pointer transition-colors text-xs ${
                  trialSettings.action_on_end === "activate_subscription_if_payment_method_exists"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <p className="font-semibold text-foreground">Cobrar Automaticamente</p>
                <p className="text-[11px] mt-1 leading-relaxed">
                  Somente se o cliente tiver cadastrado cartão válido com autorização explícita de recorrência.
                </p>
              </div>

              <div
                onClick={() =>
                  setTrialSettings({ ...trialSettings, action_on_end: "suspend_access" })
                }
                className={`p-3 rounded-lg border cursor-pointer transition-colors text-xs ${
                  trialSettings.action_on_end === "suspend_access"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <p className="font-semibold text-foreground">Suspender Acesso Total</p>
                <p className="text-[11px] mt-1 leading-relaxed">
                  Inativa a empresa imediatamente ao fim do trial, exigindo intervenção manual do suporte ou reativação.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Empresas Atualmente em Período de Trial */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Empresas em Período de Degustação</CardTitle>
              <CardDescription className="text-xs">
                Contagem regressiva do trial com indicação de dias restantes.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {trialingSubs.length} ativas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Empresa</TableHead>
                <TableHead>Início do Trial</TableHead>
                <TableHead>Término Previsto</TableHead>
                <TableHead>Dias Restantes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialingSubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                    Nenhuma empresa com trial em andamento no momento.
                  </TableCell>
                </TableRow>
              ) : (
                trialingSubs.map((sub) => {
                  const end = sub.trial_ends_at ? new Date(sub.trial_ends_at) : new Date();
                  const remaining = differenceInDays(end, new Date());
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{sub.company_name || sub.company_id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sub.trial_started_at
                          ? format(new Date(sub.trial_started_at), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {sub.trial_ends_at
                          ? format(new Date(sub.trial_ends_at), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={
                            remaining <= 2
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300"
                          }
                        >
                          {remaining <= 0 ? "Expira hoje" : `${remaining} dias restantes`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge className="bg-blue-600 text-white font-normal">Trial Ativo</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
