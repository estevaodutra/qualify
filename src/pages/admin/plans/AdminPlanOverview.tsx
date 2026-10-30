import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { billingStore } from "@/services/billing/billingStore";
import { Plan } from "@/services/billing/types";
import {
  CreditCard,
  CheckCircle2,
  Save,
  Zap,
  ShieldCheck,
  TrendingUp,
  Users,
  Coins,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminPlanOverview() {
  const { toast } = useToast();
  const [plan, setPlan] = useState<Plan>(() => billingStore.getPlan());
  const [isSaving, setIsSaving] = useState(false);

  const subscriptions = billingStore.getSubscriptions();
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;
  const trialingSubs = subscriptions.filter((s) => s.status === "trialing").length;
  const mrr = activeSubs * plan.price;

  const handleSave = () => {
    setIsSaving(true);
    try {
      const updated = billingStore.savePlan(plan, "Super Admin");
      setPlan(updated);
      toast({
        title: "Plano atualizado com sucesso!",
        description: `O plano '${plan.name}' agora está configurado para R$ ${plan.price.toFixed(2)}/mês.`,
      });
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e.message || "Não foi possível salvar as configurações do plano.",
        variant: "destructive",
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Plano Comercial Único</h1>
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
              Ativo &amp; Padrão
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configuração do modelo comercial da Qualify (R$ 197/mês + créditos variáveis sob demanda).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      {/* KPIs Operacionais do Plano */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Preço Atual</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              R$ {plan.price.toFixed(2)}
              <span className="text-xs font-normal text-muted-foreground">/mês</span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Assinaturas Ativas</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{activeSubs}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Em Período de Trial</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{trialingSubs}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">MRR Estimado</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              R$ {mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Regra de Negócio */}
      <div className="p-4 rounded-xl border bg-muted/30 flex items-start gap-3.5">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-foreground">Diretriz do Modelo Comercial Qualify</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            A Qualify adota modelo comercial de <strong>plano único sem múltiplos tiers artificiais</strong>. Disparos, conversas, contatos, pipelines, funis e conteúdos são <strong>ilimitados</strong> para os assinantes. Recursos de custo variável de terceiros (como OpenAI, modelos de IA, transcrições e ligações de voz) operam através da <strong>carteira de créditos de consumo</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Edição do Plano */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Propriedades do Plano</CardTitle>
            <CardDescription className="text-xs">
              Altere a precificação e dados descritivos que alimentam os módulos e o checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="planName" className="text-xs font-medium">Nome do Plano</Label>
                <Input
                  id="planName"
                  value={plan.name}
                  onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                  placeholder="Ex: Qualify"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="planSlug" className="text-xs font-medium">Identificador (Slug)</Label>
                <Input
                  id="planSlug"
                  value={plan.slug}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="planPrice" className="text-xs font-medium">Preço Mensal (R$)</Label>
                <Input
                  id="planPrice"
                  type="number"
                  step="0.01"
                  value={plan.price}
                  onChange={(e) => setPlan({ ...plan, price: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="planCurrency" className="text-xs font-medium">Moeda</Label>
                <Input
                  id="planCurrency"
                  value={plan.currency}
                  onChange={(e) => setPlan({ ...plan, currency: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="planInterval" className="text-xs font-medium">Periodicidade</Label>
                <Input
                  id="planInterval"
                  value={plan.billing_interval === "month" ? "Mensal (recorrente)" : plan.billing_interval}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planDesc" className="text-xs font-medium">Descrição Institucional</Label>
              <Textarea
                id="planDesc"
                rows={3}
                value={plan.description}
                onChange={(e) => setPlan({ ...plan, description: e.target.value })}
                placeholder="Descrição do plano visível para a equipe e no onboarding..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Card Visual / Prévia Comercial */}
        <div className="space-y-4">
          <Card className="border-primary/50 shadow-md bg-card relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-1 rounded-bl-lg">
              PLANO ATIVO
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-foreground">
                  R$ {plan.price.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">/mês</span>
              </div>
              <CardDescription className="text-xs mt-2">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs border-t pt-3">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Disparos de mensagens ilimitados</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Conversas e contatos ilimitados</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Pipelines, funis e workflows ilimitados</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>WhatsApp configurável pelo Admin</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Coins className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Motor de IA e Mídia tarifados por crédito</span>
              </div>
            </CardContent>
          </Card>

          {/* Atalhos Rápidos */}
          <Card className="p-4 space-y-2 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Configurações Associadas
            </p>
            <div className="space-y-1.5">
              <Link
                to="/admin/planos/limites"
                className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-card border transition-colors"
              >
                <span>Ajustar Matriz de Limites</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                to="/admin/planos/bonus"
                className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-card border transition-colors"
              >
                <span>Configurar Bônus de Boas-Vindas</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                to="/admin/planos/trial"
                className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-card border transition-colors"
              >
                <span>Configurar Regras de Trial</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
