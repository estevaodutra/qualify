import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/dispatch";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Faturamento"
        description="Gerencie sua assinatura e acompanhe o uso"
        actions={
          <Button className="gap-2" onClick={() => setShowUpgradeDialog(true)}>
            <ArrowUpRight className="h-4 w-4" />
            Fazer Upgrade
          </Button>
        }
      />

      {/* Current Plan */}
      <Card className="shadow-elevation-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Plano {currentPlan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{currentPlan.price}</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              Plano Gratuito
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Meters */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Despachos</span>
                <span className="font-mono font-medium">
                  {currentPlan.dispatches.used.toLocaleString()} / {currentPlan.dispatches.limit.toLocaleString()}
                </span>
              </div>
              <Progress value={Math.min(dispatchPercentage, 100)} className="h-2" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Campanhas Ativas</span>
                <span className="font-mono font-medium">
                  {currentPlan.campaigns.used} / {currentPlan.campaigns.limit}
                </span>
              </div>
              <Progress
                value={(currentPlan.campaigns.used / currentPlan.campaigns.limit) * 100}
                className="h-2"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Números de Telefone</span>
                <span className="font-mono font-medium">
                  {currentPlan.numbers.used} / {currentPlan.numbers.limit}
                </span>
              </div>
              <Progress
                value={(currentPlan.numbers.used / currentPlan.numbers.limit) * 100}
                className="h-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowChangePlanDialog(true)}>
              Mudar Plano
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card className="shadow-elevation-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Histórico de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Receipt}
            title="Sem histórico de uso"
            description="O histórico de uso aparecerá aqui conforme você usar o serviço"
            className="py-8"
          />
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="shadow-elevation-sm">
        <CardHeader>
          <CardTitle className="text-base">Método de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Nenhum cartão cadastrado</p>
                <p className="text-sm text-muted-foreground">Adicione um cartão para fazer upgrade</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowUpdatePaymentDialog(true)}>
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

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
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground/50"
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
                  <Badge variant="secondary" className="mt-2">
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
