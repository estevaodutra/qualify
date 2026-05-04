import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CreditCard, Zap, ArrowUpRight, Calendar, Loader2, Receipt } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useInstances } from "@/hooks/useInstances";
import { useCampaigns } from "@/hooks/useCampaigns";

// Default free plan configuration
const freePlan = {
  name: "Free",
  price: "$0/mês",
  renewalDate: "—",
  dispatches: { limit: 1000 },
  campaigns: { limit: 3 },
  numbers: { limit: 5 },
};

const plans = [
  { name: "Free", price: "$0/mês", dispatches: 1000, campaigns: 3, numbers: 5 },
  { name: "Starter", price: "$49/mês", dispatches: 10000, campaigns: 5, numbers: 20 },
  { name: "Pro", price: "$99/mês", dispatches: 25000, campaigns: 15, numbers: 50 },
  { name: "Enterprise", price: "$299/mês", dispatches: 100000, campaigns: 50, numbers: 200 },
];

export default function Billing() {
  const { toast } = useToast();
  const { instances } = useInstances();
  const { campaigns } = useCampaigns();
  
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [showUpdatePaymentDialog, setShowUpdatePaymentDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  // Calculate usage from real data
  const totalDispatches = instances.reduce((acc, i) => acc + (i.dispatches || 0), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "running" || c.status === "paused").length;
  const activeNumbers = instances.length;

  const currentPlan = {
    ...freePlan,
    dispatches: { used: totalDispatches, limit: freePlan.dispatches.limit },
    campaigns: { used: activeCampaigns, limit: freePlan.campaigns.limit },
    numbers: { used: activeNumbers, limit: freePlan.numbers.limit },
  };

  const dispatchPercentage = (currentPlan.dispatches.used / currentPlan.dispatches.limit) * 100;
  const campaignsPercentage = (currentPlan.campaigns.used / currentPlan.campaigns.limit) * 100;
  const numbersPercentage = (currentPlan.numbers.used / currentPlan.numbers.limit) * 100;

  const handleUpgrade = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowUpgradeDialog(false);
    toast({
      title: "Plano atualizado!",
      description: "Você foi atualizado para o plano Enterprise.",
    });
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowChangePlanDialog(false);
    toast({
      title: "Plano alterado",
      description: `Você mudou para o plano ${selectedPlan}.`,
    });
  };

  const handleUpdatePayment = async () => {
    if (!paymentForm.cardNumber || !paymentForm.expiry || !paymentForm.cvc) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os dados do cartão.",
        variant: "destructive",
      });
      return;
    }
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowUpdatePaymentDialog(false);
    setPaymentForm({ cardNumber: "", expiry: "", cvc: "" });
    toast({
      title: "Método de pagamento atualizado",
      description: "Seu novo cartão foi salvo.",
    });
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <PageHeader
        title="Faturamento & Planos"
        description="Gerencie sua assinatura, visualize o uso detalhado e gerencie seus métodos de pagamento."
        actions={
          <Button className="h-11 px-6 gap-2.5 rounded-xl gradient-primary glow-primary font-['Sora'] font-semibold shadow-lg transition-all hover:opacity-90 active:scale-95" onClick={() => setShowUpgradeDialog(true)}>
            <ArrowUpRight className="h-5 w-5" />
            Upgrade para Enterprise
          </Button>
        }
      />

      <div className="grid gap-8">
        {/* Current Plan Card */}
        <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="p-8 border-b border-border/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-[#8A3CFF]/15 to-[#2E39D9]/10 border border-[#8A3CFF]/20 shadow-sm">
                  <Zap className="h-7 w-7 text-[#8A3CFF]" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl font-bold tracking-tight">Plano {currentPlan.name}</CardTitle>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">
                      Ativo
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground/60 mt-1">Sua conta atual está no modo de avaliação gratuita.</p>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-3xl font-black text-foreground">{currentPlan.price}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">Próxima renovação: {currentPlan.renewalDate}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
            {/* Usage Meters */}
            <div className="grid gap-8 md:grid-cols-3">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Despachos Mensais</span>
                  <span className="text-xs font-bold font-mono">
                    {currentPlan.dispatches.used.toLocaleString()} / {currentPlan.dispatches.limit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-muted/20 rounded-full overflow-hidden border border-border/5">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-out",
                      dispatchPercentage > 80 ? "bg-gradient-to-r from-[#FF7A7A] to-[#FF5CF7]" : "bg-gradient-to-r from-[#8A3CFF] to-[#2E39D9]"
                    )}
                    style={{ width: `${Math.min(dispatchPercentage, 100)}%` }} 
                  />
                </div>
                <p className="text-[10px] font-medium text-muted-foreground/40">{100 - Math.min(dispatchPercentage, 100).toFixed(1)}% de margem disponível</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Campanhas Ativas</span>
                  <span className="text-xs font-bold font-mono">
                    {currentPlan.campaigns.used} / {currentPlan.campaigns.limit}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-muted/20 rounded-full overflow-hidden border border-border/5">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-out",
                      campaignsPercentage > 80 ? "bg-gradient-to-r from-[#FF7A7A] to-[#FF5CF7]" : "bg-gradient-to-r from-[#8A3CFF] to-[#2E39D9]"
                    )}
                    style={{ width: `${Math.min(campaignsPercentage, 100)}%` }} 
                  />
                </div>
                <p className="text-[10px] font-medium text-muted-foreground/40">Limite de automações simultâneas</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Instâncias (Chips)</span>
                  <span className="text-xs font-bold font-mono">
                    {currentPlan.numbers.used} / {currentPlan.numbers.limit}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-muted/20 rounded-full overflow-hidden border border-border/5">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-out",
                      numbersPercentage > 80 ? "bg-gradient-to-r from-[#FF7A7A] to-[#FF5CF7]" : "bg-gradient-to-r from-[#8A3CFF] to-[#2E39D9]"
                    )}
                    style={{ width: `${Math.min(numbersPercentage, 100)}%` }} 
                  />
                </div>
                <p className="text-[10px] font-medium text-muted-foreground/40">Conexões ativas de WhatsApp/Voz</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" className="rounded-xl font-bold border-border/40 hover:bg-primary/5 hover:text-primary transition-all" onClick={() => setShowChangePlanDialog(true)}>
                Upgrade de Plano
              </Button>
              <Button variant="ghost" className="rounded-xl font-bold text-muted-foreground/60 hover:text-foreground">
                Ver detalhes do consumo
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Usage History Card */}
          <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-3xl">
            <CardHeader className="p-6 border-b border-border/10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/10 text-muted-foreground/60">
                  <Receipt className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold">Histórico de Uso</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <EmptyState
                icon={Receipt}
                title="Sem faturas pendentes"
                description="Seu histórico de faturamento e uso aparecerá aqui mensalmente."
                className="py-12 border-none bg-transparent"
              />
            </CardContent>
          </Card>

          {/* Payment Method Card */}
          <Card className="border-white/40 bg-card/60 backdrop-blur-xl shadow-sm rounded-3xl">
            <CardHeader className="p-6 border-b border-border/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/10 text-muted-foreground/60">
                  <CreditCard className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold">Método de Pagamento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted/5 flex items-center justify-center mb-4">
                  <CreditCard className="h-8 w-8 text-muted-foreground/20" />
                </div>
                <h4 className="font-bold text-foreground">Nenhum cartão cadastrado</h4>
                <p className="text-sm text-muted-foreground/60 mt-1 mb-6 max-w-[200px]">Adicione um método de pagamento seguro para habilitar upgrades.</p>
                <Button variant="outline" className="w-full rounded-xl font-bold border-border/40 hover:bg-primary/5 hover:text-primary" onClick={() => setShowUpdatePaymentDialog(true)}>
                  Adicionar Novo Cartão
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade para Enterprise</DialogTitle>
            <DialogDescription>
              Obtenha 100.000 despachos, 50 campanhas e 200 números por $299/mês.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between">
                <span>Despachos</span>
                <span className="font-medium">100.000/mês</span>
              </div>
              <div className="flex justify-between">
                <span>Campanhas</span>
                <span className="font-medium">50</span>
              </div>
              <div className="flex justify-between">
                <span>Números de Telefone</span>
                <span className="font-medium">200</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Total</span>
                <span className="font-bold">$299/mês</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpgrade} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Fazer Upgrade Agora"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mudar Plano</DialogTitle>
            <DialogDescription>Selecione um novo plano para sua conta.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                  selectedPlan === plan.name
                    ? "border-[#8A3CFF] bg-[#8A3CFF]/5"
                    : "hover:border-[#8A3CFF]/40"
                } ${plan.name === currentPlan.name ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => plan.name !== currentPlan.name && setSelectedPlan(plan.name)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {plan.dispatches.toLocaleString()} despachos • {plan.campaigns} campanhas •{" "}
                      {plan.numbers} números
                    </p>
                  </div>
                  <span className="font-bold">{plan.price}</span>
                </div>
                {plan.name === currentPlan.name && (
                  <Badge variant="outline" className="mt-2 bg-[#22DD4F]/10 text-[#22DD4F] border-[#22DD4F]/20">
                    Plano Atual
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePlan} disabled={isProcessing || !selectedPlan}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Mudar Plano"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Payment Dialog */}
      <Dialog open={showUpdatePaymentDialog} onOpenChange={setShowUpdatePaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Método de Pagamento</DialogTitle>
            <DialogDescription>Insira os dados do seu cartão.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Número do Cartão</Label>
              <Input
                id="cardNumber"
                placeholder="4242 4242 4242 4242"
                value={paymentForm.cardNumber}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, cardNumber: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Validade</Label>
                <Input
                  id="expiry"
                  placeholder="MM/AA"
                  value={paymentForm.expiry}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, expiry: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  value={paymentForm.cvc}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, cvc: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdatePaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePayment} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Cartão"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
