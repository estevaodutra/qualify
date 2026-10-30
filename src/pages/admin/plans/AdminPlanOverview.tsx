import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { billingStore } from "@/services/billing/billingStore";
import { Plan, BillingInterval, PlanStatus } from "@/services/billing/types";
import {
  CreditCard,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  Zap,
  ShieldCheck,
  TrendingUp,
  Users,
  Coins,
  Clock,
  Timer,
  Star,
  Check,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminPlanOverview() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>(() => billingStore.getPlans());
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    const list = billingStore.getPlans();
    return list[0]?.id || "plan_qualify_standard";
  });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const [editingPlan, setEditingPlan] = useState<Plan>(selectedPlan);
  const [isSaving, setIsSaving] = useState(false);

  // New feature bullet input inside editor
  const [newFeatureText, setNewFeatureText] = useState("");

  // Modal State for New Plan
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState<Partial<Plan>>({
    name: "",
    slug: "",
    price: 297,
    currency: "BRL",
    billing_interval: "month",
    trial_days: 7,
    status: "active",
    is_default: false,
    highlight_badge: "",
    description: "",
    features: [
      "Disparos de mensagens ilimitados",
      "Conversas e contatos ilimitados",
      "Pipelines e automações sem limite",
    ],
  });

  const subscriptions = billingStore.getSubscriptions();
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;
  const trialingSubs = subscriptions.filter((s) => s.status === "trialing").length;
  const mrr = subscriptions
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + (s.price_snapshot || selectedPlan.price), 0);

  // When switching selected plan
  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlanId(plan.id);
    setEditingPlan({ ...plan });
  };

  const handleSaveCurrentPlan = () => {
    setIsSaving(true);
    try {
      const updated = billingStore.savePlan(editingPlan, "Super Admin");
      const updatedList = billingStore.getPlans();
      setPlans(updatedList);
      setEditingPlan(updated);
      toast({
        title: "Plano atualizado com sucesso!",
        description: `O plano '${updated.name}' foi salvo (R$ ${updated.price.toFixed(2)}, Trial: ${updated.trial_days} dias).`,
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

  const handleCreateNewPlan = () => {
    if (!newPlanForm.name) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do novo plano.",
        variant: "destructive",
      });
      return;
    }

    const slug =
      newPlanForm.slug ||
      newPlanForm.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "-");

    const newPlan: Plan = {
      id: "plan_" + Math.random().toString(36).substring(2, 9),
      name: newPlanForm.name,
      slug,
      description: newPlanForm.description || "Plano comercial da plataforma Qualify.",
      price: typeof newPlanForm.price === "number" ? newPlanForm.price : 197,
      currency: newPlanForm.currency || "BRL",
      billing_interval: (newPlanForm.billing_interval as BillingInterval) || "month",
      trial_days: typeof newPlanForm.trial_days === "number" ? newPlanForm.trial_days : 7,
      status: (newPlanForm.status as PlanStatus) || "active",
      is_default: Boolean(newPlanForm.is_default),
      highlight_badge: newPlanForm.highlight_badge || undefined,
      features: newPlanForm.features || [
        "Disparos de mensagens ilimitados",
        "Conversas e contatos ilimitados",
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = billingStore.savePlan(newPlan, "Super Admin");
    const updatedList = billingStore.getPlans();
    setPlans(updatedList);
    setSelectedPlanId(created.id);
    setEditingPlan(created);
    setIsNewPlanModalOpen(false);

    toast({
      title: "Novo plano criado com sucesso!",
      description: `O plano '${created.name}' já está disponível para uso na plataforma.`,
    });
  };

  const handleDeletePlan = (planId: string) => {
    try {
      billingStore.deletePlan(planId, "Super Admin");
      const updatedList = billingStore.getPlans();
      setPlans(updatedList);
      if (selectedPlanId === planId) {
        setSelectedPlanId(updatedList[0]?.id || "");
        setEditingPlan(updatedList[0]);
      }
      toast({
        title: "Plano removido",
        description: "O plano foi excluído com sucesso da plataforma.",
      });
    } catch (e: any) {
      toast({
        title: "Não foi possível excluir",
        description: e.message || "Erro ao remover plano.",
        variant: "destructive",
      });
    }
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    const currentFeatures = editingPlan.features || [];
    setEditingPlan({
      ...editingPlan,
      features: [...currentFeatures, newFeatureText.trim()],
    });
    setNewFeatureText("");
  };

  const handleRemoveFeature = (index: number) => {
    const currentFeatures = editingPlan.features || [];
    setEditingPlan({
      ...editingPlan,
      features: currentFeatures.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Planos da Plataforma</h1>
            <Badge variant="outline" className="text-xs">
              {plans.length} {plans.length === 1 ? "plano cadastrado" : "planos cadastrados"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie e crie planos comerciais, defina preços, tempo de teste (trial) e benefícios de cada oferta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setNewPlanForm({
                name: "",
                slug: "",
                price: 297,
                currency: "BRL",
                billing_interval: "month",
                trial_days: 7,
                status: "active",
                is_default: false,
                highlight_badge: "",
                description: "",
                features: [
                  "Disparos de mensagens ilimitados",
                  "Conversas e contatos ilimitados",
                  "Pipelines e automações sem limite",
                ],
              });
              setIsNewPlanModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Plano
          </Button>
          <Button onClick={handleSaveCurrentPlan} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      {/* KPIs Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Plano Selecionado</p>
            <p className="text-xl font-bold text-foreground mt-0.5 truncate max-w-[150px]">
              {selectedPlan.name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              R$ {selectedPlan.price.toFixed(2)}/{selectedPlan.billing_interval === "month" ? "mês" : selectedPlan.billing_interval}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Tempo de Teste (Trial)</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {editingPlan.trial_days > 0 ? `${editingPlan.trial_days} dias` : "Sem teste"}
            </p>
            <p className="text-[11px] text-muted-foreground">Período de degustação</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Timer className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Assinaturas Ativas</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{activeSubs}</p>
            <p className="text-[11px] text-muted-foreground">{trialingSubs} em degustação</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">MRR Estimado</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
              R$ {mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground">Receita Recorrente Mensal</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Seletor de Planos da Plataforma */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Planos Cadastrados (Clique para selecionar e editar)
          </Label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((p) => {
            const isSelected = p.id === editingPlan.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPlan(p)}
                className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                  isSelected
                    ? "border-primary bg-primary/[0.03] shadow-md ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground">{p.name}</span>
                    {p.is_default && (
                      <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                        Padrão
                      </Badge>
                    )}
                  </div>
                  {p.highlight_badge && (
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                      {p.highlight_badge}
                    </Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-extrabold text-foreground">
                    R$ {p.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    /{p.billing_interval === "month" ? "mês" : p.billing_interval === "year" ? "ano" : p.billing_interval}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    {p.trial_days > 0 ? `${p.trial_days} dias de teste` : "Sem trial"}
                  </span>
                  <span>&bull;</span>
                  <span className={p.status === "active" ? "text-foreground" : "text-muted-foreground"}>
                    {p.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Formulário de Configuração Completa do Plano Selecionado */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Configuração Completa: {editingPlan.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  Ajuste preços, tempo de teste (trial), identificador técnico e benefícios deste plano.
                </CardDescription>
              </div>
              {!editingPlan.is_default && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePlan(editingPlan.id)}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir Plano
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="planName" className="text-xs font-medium">Nome do Plano</Label>
                <Input
                  id="planName"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  placeholder="Ex: Qualify Pro"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="planSlug" className="text-xs font-medium">Identificador (Slug)</Label>
                <Input
                  id="planSlug"
                  value={editingPlan.slug}
                  onChange={(e) => setEditingPlan({ ...editingPlan, slug: e.target.value })}
                  placeholder="Ex: qualify-pro"
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="planPrice" className="text-xs font-medium">Preço (R$)</Label>
                <Input
                  id="planPrice"
                  type="number"
                  step="0.01"
                  value={editingPlan.price}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })
                  }
                  className="h-9 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="planInterval" className="text-xs font-medium">Periodicidade de Cobrança</Label>
                <Select
                  value={editingPlan.billing_interval}
                  onValueChange={(val: BillingInterval) =>
                    setEditingPlan({ ...editingPlan, billing_interval: val })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Mensal (recorrente)</SelectItem>
                    <SelectItem value="quarter">Trimestral</SelectItem>
                    <SelectItem value="year">Anual</SelectItem>
                    <SelectItem value="one_time">Cobrança Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* TEMPO DE TESTE / TRIAL CONFIGURÁVEL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="planTrial" className="text-xs font-medium">Tempo de Teste (Trial)</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">0 = sem trial</span>
                </div>
                <div className="relative">
                  <Input
                    id="planTrial"
                    type="number"
                    min="0"
                    max="90"
                    value={editingPlan.trial_days}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        trial_days: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="h-9 pr-14 font-semibold text-emerald-600 dark:text-emerald-400"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none">
                    dias
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="planBadge" className="text-xs font-medium">Badge de Destaque (Opcional)</Label>
                <Input
                  id="planBadge"
                  value={editingPlan.highlight_badge || ""}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, highlight_badge: e.target.value })
                  }
                  placeholder="Ex: Mais Popular, Recomendado, Lançamento"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status do Plano</Label>
                <Select
                  value={editingPlan.status}
                  onValueChange={(val: PlanStatus) =>
                    setEditingPlan({ ...editingPlan, status: val })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo (Disponível no Onboarding)</SelectItem>
                    <SelectItem value="inactive">Inativo (Pausado)</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Switch Plano Padrão */}
            <div className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">Definir como Plano Padrão da Plataforma</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Novos cadastros sem oferta específica receberão este plano automaticamente.
                </p>
              </div>
              <Switch
                checked={editingPlan.is_default}
                onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, is_default: checked })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planDesc" className="text-xs font-medium">Descrição Institucional</Label>
              <Textarea
                id="planDesc"
                rows={2}
                value={editingPlan.description}
                onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                placeholder="Descrição comercial exibida para os clientes..."
              />
            </div>

            {/* Lista de Recursos / Benefícios Inclusos */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold">Destaques e Recursos Inclusos</Label>
              <div className="space-y-1.5">
                {(editingPlan.features || []).map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card text-xs"
                  >
                    <div className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFeature(idx)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Input
                  value={newFeatureText}
                  onChange={(e) => setNewFeatureText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFeature())}
                  placeholder="Ex: Até 5 contas WhatsApp inclusas..."
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFeature}
                  className="h-8 text-xs"
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Visual / Prévia Comercial em Tempo Real */}
        <div className="space-y-4">
          <Card className="border-primary/50 shadow-md bg-card relative overflow-hidden">
            {editingPlan.highlight_badge ? (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-1 rounded-bl-lg">
                {editingPlan.highlight_badge.toUpperCase()}
              </div>
            ) : editingPlan.is_default ? (
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-semibold px-3 py-1 rounded-bl-lg">
                PADRÃO
              </div>
            ) : null}

            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold">{editingPlan.name}</CardTitle>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-foreground">
                  R$ {editingPlan.price.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">
                  /{editingPlan.billing_interval === "month" ? "mês" : editingPlan.billing_interval === "year" ? "ano" : editingPlan.billing_interval}
                </span>
              </div>
              <CardDescription className="text-xs mt-2 line-clamp-3">
                {editingPlan.description}
              </CardDescription>

              {/* Destaque do Trial */}
              <div className="mt-2.5 pt-2 border-t">
                {editingPlan.trial_days > 0 ? (
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs gap-1.5 py-1">
                    <Clock className="h-3.5 w-3.5" />
                    {editingPlan.trial_days} dias de teste gratuito
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-xs gap-1.5 py-1">
                    Sem período de teste (ativação direta)
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-2 text-xs border-t pt-3">
              {(editingPlan.features || []).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-foreground font-medium pt-1">
                <Coins className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Motor de IA e Mídia tarifados por crédito</span>
              </div>
            </CardContent>
          </Card>

          {/* Atalhos Rápidos */}
          <Card className="p-4 space-y-2 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Módulos Associados
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
                to="/admin/planos/trial"
                className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-card border transition-colors"
              >
                <span>Políticas Globais de Trial &amp; Grace</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                to="/admin/planos/links"
                className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-card border transition-colors"
              >
                <span>Criar Link de Cadastro para este Plano</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Criação de Novo Plano */}
      <Dialog open={isNewPlanModalOpen} onOpenChange={setIsNewPlanModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Cadastrar Novo Plano Comercial
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adicione um novo nível de plano com precificação e tempo de teste personalizados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Plano</Label>
                <Input
                  value={newPlanForm.name}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
                  placeholder="Ex: Qualify Enterprise"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Identificador (Slug)</Label>
                <Input
                  value={newPlanForm.slug}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, slug: e.target.value })}
                  placeholder="Ex: enterprise"
                  className="h-9 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPlanForm.price}
                  onChange={(e) =>
                    setNewPlanForm({
                      ...newPlanForm,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-9 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Periodicidade</Label>
                <Select
                  value={newPlanForm.billing_interval || "month"}
                  onValueChange={(val: BillingInterval) =>
                    setNewPlanForm({ ...newPlanForm, billing_interval: val })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Mensal</SelectItem>
                    <SelectItem value="quarter">Trimestral</SelectItem>
                    <SelectItem value="year">Anual</SelectItem>
                    <SelectItem value="one_time">Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Teste (Dias)</Label>
                <Input
                  type="number"
                  min="0"
                  max="90"
                  value={newPlanForm.trial_days}
                  onChange={(e) =>
                    setNewPlanForm({
                      ...newPlanForm,
                      trial_days: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="h-9 font-semibold text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Badge de Destaque (Opcional)</Label>
              <Input
                value={newPlanForm.highlight_badge || ""}
                onChange={(e) =>
                  setNewPlanForm({ ...newPlanForm, highlight_badge: e.target.value })
                }
                placeholder="Ex: Recomendado, Lançamento"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                rows={2}
                value={newPlanForm.description || ""}
                onChange={(e) =>
                  setNewPlanForm({ ...newPlanForm, description: e.target.value })
                }
                placeholder="Descrição resumida do plano..."
              />
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">Tornar este o Plano Padrão?</Label>
                <p className="text-[11px] text-muted-foreground">
                  Substituirá o padrão atual da plataforma.
                </p>
              </div>
              <Switch
                checked={newPlanForm.is_default}
                onCheckedChange={(checked) =>
                  setNewPlanForm({ ...newPlanForm, is_default: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewPlanModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateNewPlan}>Cadastrar Plano</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
