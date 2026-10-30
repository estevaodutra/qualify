import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Zap,
  ArrowUpRight,
  Calendar,
  Loader2,
  Receipt,
  Gift,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Clock,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { billingStore } from "@/services/billing/billingStore";
import { CreditService } from "@/services/billing/creditService";
import { format, differenceInDays } from "date-fns";

export default function Billing() {
  const { toast } = useToast();

  const plan = billingStore.getPlan();
  const trialSettings = billingStore.getTrialSettings();

  // For current demo company (c1)
  const currentCompanyId = "c1";
  const [wallet, setWallet] = useState(() => CreditService.getWallet(currentCompanyId));
  const [subscription, setSubscription] = useState(() =>
    billingStore.getSubscriptionByCompany(currentCompanyId)
  );

  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("50.00");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  const isTrialing = subscription?.status === "trialing";
  const trialEndDate = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const trialDaysRemaining = trialEndDate ? Math.max(0, differenceInDays(trialEndDate, new Date())) : 0;

  const handleRecharge = async () => {
    const val = parseFloat(rechargeAmount);
    if (isNaN(val) || val <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor de recarga válido.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    CreditService.addPurchasedCredits(
      currentCompanyId,
      val,
      `Recarga de Créditos no App (R$ ${val.toFixed(2)})`
    );
    setWallet(CreditService.getWallet(currentCompanyId));

    setIsProcessing(false);
    setShowRechargeDialog(false);

    toast({
      title: "Recarga concluída!",
      description: `R$ ${val.toFixed(2)} foram creditados com sucesso em sua carteira.`,
    });
  };

  const handleSavePayment = async () => {
    if (!paymentForm.cardNumber || !paymentForm.expiry || !paymentForm.cvc) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos do cartão.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (subscription) {
      const updated = {
        ...subscription,
        status: "active" as const,
        payment_method_brand: "Mastercard",
        payment_method_last4: paymentForm.cardNumber.slice(-4) || "4242",
      };
      billingStore.saveSubscription(updated, "Cliente");
      setSubscription(updated);
    }

    setIsProcessing(false);
    setShowPaymentDialog(false);
    setPaymentForm({ cardNumber: "", expiry: "", cvc: "" });

    toast({
      title: "Método de pagamento salvo!",
      description: "Sua assinatura mensal recorrente está ativa.",
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10 max-w-6xl mx-auto">
      <PageHeader
        title="Plano &amp; Faturamento"
        description="Gerencie seu plano comercial, saldo de créditos para IA e métodos de pagamento."
        actions={
          <Button
            className="h-10 px-5 gap-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md transition-all hover:opacity-95"
            onClick={() => setShowRechargeDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Recarregar Créditos
          </Button>
        }
      />

      {/* Banner de Trial (quando aplicável) */}
      {isTrialing && (
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">
                Seu período gratuito de degustação termina em {trialDaysRemaining} {trialDaysRemaining === 1 ? "dia" : "dias"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Trial válido até: {trialEndDate ? format(trialEndDate, "dd/MM/yyyy") : "—"}. Ative sua forma de pagamento para manter sua operação contínua.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowPaymentDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shrink-0"
          >
            Ativar Assinatura
          </Button>
        </div>
      )}

      {/* Grid: Plano Atual & Carteira de Créditos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plano Atual */}
        <Card className="lg:col-span-1 shadow-sm border-primary/30 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Plano Atual
              </span>
              <Badge className="bg-emerald-600 text-white font-medium text-[11px]">
                {subscription?.status === "trialing" ? "Trial Ativo" : "Assinatura Ativa"}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mt-2">
              {plan.name}
            </CardTitle>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold text-foreground">
                R$ {plan.price.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">/mês</span>
            </div>
            <CardDescription className="text-xs mt-2 leading-relaxed">
              Plano comercial completo com disparos, conversas e contatos ilimitados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs border-t">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Próxima Cobrança:</span>
              <span className="font-medium text-foreground">
                {subscription?.current_period_end
                  ? format(new Date(subscription.current_period_end), "dd/MM/yyyy")
                  : "Renovação Mensal"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-foreground font-medium pt-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Disparos de mensagens ilimitados</span>
            </div>
            <div className="flex items-center gap-2 text-foreground font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Conversas e contatos ilimitados</span>
            </div>
            <div className="flex items-center gap-2 text-foreground font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Pipelines e automações ilimitados</span>
            </div>
          </CardContent>
        </Card>

        {/* Carteira de Consumo de Créditos */}
        <Card className="lg:col-span-2 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-500" />
                  Saldo de Créditos da Empresa
                </CardTitle>
                <CardDescription className="text-xs">
                  Recursos variáveis de IA (skills e modelos) e transcrições consom este saldo.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRechargeDialog(true)}
                className="gap-1.5 h-8 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Saldo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border bg-muted/20">
                <span className="text-xs text-muted-foreground font-medium">Saldo Disponível</span>
                <p className="text-2xl font-black text-foreground mt-1">
                  R$ {wallet.total_available.toFixed(2)}
                </p>
                <span className="text-[10px] text-muted-foreground">Total para uso interno</span>
              </div>

              <div className="p-4 rounded-xl border bg-muted/20">
                <span className="text-xs text-muted-foreground font-medium">Créditos Comprados</span>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  R$ {wallet.purchased_balance.toFixed(2)}
                </p>
                <span className="text-[10px] text-muted-foreground">Recargas via cartão / PIX</span>
              </div>

              <div className="p-4 rounded-xl border bg-muted/20">
                <span className="text-xs text-muted-foreground font-medium">Créditos Bônus</span>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  R$ {wallet.bonus_balance.toFixed(2)}
                </p>
                <span className="text-[10px] text-muted-foreground">Bonificações promocionais</span>
              </div>
            </div>

            {/* Disclaimer Obrigatório dos Créditos Bônus */}
            <div className="p-3 rounded-lg border bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Aviso:</strong> Créditos bônus são promocionais e podem ser utilizados apenas dentro da plataforma. Não são sacáveis, transferíveis ou convertíveis em dinheiro.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Método de Pagamento & Faturas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Método de Pagamento */}
        <Card className="shadow-sm">
          <CardHeader className="p-6 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Forma de Pagamento Cadastrada</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPaymentDialog(true)}
              className="text-xs h-8"
            >
              Alterar Cartão
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {subscription?.payment_method_last4 ? (
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {subscription.payment_method_brand || "Cartão de Crédito"} •••• {subscription.payment_method_last4}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Utilizado para a renovação automática da mensalidade de R$ {plan.price.toFixed(2)}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaymentDialog(true)}
                  className="mt-3 text-xs"
                >
                  Cadastrar Cartão Agora
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico Recente de Consumo */}
        <Card className="shadow-sm">
          <CardHeader className="p-6 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-bold">Faturas e Recargas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <EmptyState
              icon={Receipt}
              title="Sem faturas pendentes"
              description="Suas notas fiscais e comprovantes de recarga ficam disponíveis mensalmente."
              className="py-6 border-none bg-transparent"
            />
          </CardContent>
        </Card>
      </div>

      {/* Modal de Recarga de Créditos */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Recarga de Créditos de Consumo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adicione créditos para consumo sob demanda em IA, geração de criativos e automações de voz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor da Recarga (R$)</Label>
              <Input
                type="number"
                step="10.00"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                className="h-10 text-base font-bold"
              />
            </div>
            <div className="flex gap-2">
              {["25.00", "50.00", "100.00", "200.00"].map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRechargeAmount(v)}
                  className="flex-1 text-xs"
                >
                  R$ {v}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRechargeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRecharge} disabled={isProcessing}>
              {isProcessing ? "Confirmando..." : "Confirmar Recarga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Atualização de Cartão */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Cadastrar Cartão de Crédito
            </DialogTitle>
            <DialogDescription className="text-xs">
              Insira os dados do cartão para pagamento da assinatura recorrente da Qualify.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Número do Cartão</Label>
              <Input
                placeholder="4242 •••• •••• 4242"
                value={paymentForm.cardNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, cardNumber: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Validade</Label>
                <Input
                  placeholder="MM/AA"
                  value={paymentForm.expiry}
                  onChange={(e) => setPaymentForm({ ...paymentForm, expiry: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CVV</Label>
                <Input
                  placeholder="123"
                  value={paymentForm.cvc}
                  onChange={(e) => setPaymentForm({ ...paymentForm, cvc: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePayment} disabled={isProcessing}>
              {isProcessing ? "Salvando..." : "Salvar Cartão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
