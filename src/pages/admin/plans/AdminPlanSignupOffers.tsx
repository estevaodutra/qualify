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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { SignupOfferService } from "@/services/billing/signupOfferService";
import { SignupOffer } from "@/services/billing/types";
import {
  Link2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Gift,
  Timer,
  Users,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminPlanSignupOffers() {
  const { toast } = useToast();
  const [offers, setOffers] = useState<SignupOffer[]>(() => billingStore.getOffers());
  const [plans, setPlans] = useState(() => billingStore.getPlans());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formToken, setFormToken] = useState("");
  const [formPlanId, setFormPlanId] = useState(plans[0]?.id || "plan_qualify_standard");
  const [formTrialEnabled, setFormTrialEnabled] = useState(true);
  const [formTrialDays, setFormTrialDays] = useState("7");
  const [formBonus, setFormBonus] = useState<string>("5.00");
  const [formMaxRedemptions, setFormMaxRedemptions] = useState("");
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [formCampaign, setFormCampaign] = useState("");

  const handleCopyLink = (token: string, id: string) => {
    const origin = window.location.origin;
    const url = `${origin}/cadastro?offer=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({
      title: "Link de cadastro copiado!",
      description: url,
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenCreate = () => {
    setFormName("");
    setFormToken("promo-" + Math.random().toString(36).substring(2, 7));
    setFormPlanId(plans[0]?.id || "plan_qualify_standard");
    setFormTrialEnabled(true);
    setFormTrialDays(String(plans[0]?.trial_days ?? 7));
    setFormBonus("5.00");
    setFormMaxRedemptions("");
    setFormExpiresAt("");
    setFormCampaign("");
    setIsModalOpen(true);
  };

  const handleCreateOffer = () => {
    if (!formName || !formToken) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe o nome da oferta e o token identificador.",
        variant: "destructive",
      });
      return;
    }

    try {
      const bonusNum = formBonus !== "" ? parseFloat(formBonus) : null;
      const trialDaysNum = parseInt(formTrialDays, 10) || 7;
      const maxRedemptionsNum = formMaxRedemptions !== "" ? parseInt(formMaxRedemptions, 10) : null;

      SignupOfferService.saveOffer(
        {
          name: formName,
          token: formToken,
          plan_id: formPlanId,
          trial_enabled: formTrialEnabled,
          trial_days: trialDaysNum,
          bonus_credits: bonusNum,
          max_redemptions: maxRedemptionsNum,
          expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          campaign: formCampaign || undefined,
          status: "active",
        },
        "Super Admin"
      );

      setOffers(billingStore.getOffers());
      setIsModalOpen(false);

      toast({
        title: "Link de cadastro criado com sucesso!",
        description: `Oferta '${formName}' ativa com token '${formToken}'.`,
      });
    } catch (e: any) {
      toast({
        title: "Erro ao criar link",
        description: e.message || "Falha ao registrar oferta.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = (offer: SignupOffer) => {
    const newStatus = offer.status === "active" ? "paused" : "active";
    const updated = { ...offer, status: newStatus as any };
    billingStore.saveOffer(updated, "Super Admin");
    setOffers(billingStore.getOffers());
    toast({
      title: `Link ${newStatus === "active" ? "ativado" : "pausado"}`,
      description: `O link '${offer.name}' agora está ${newStatus}.`,
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Links de Cadastro Vinculados</h1>
            <Badge variant="outline" className="text-xs">Token Seguro no Backend</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crie links especiais de onboarding com trial customizado e bônus exclusivo por campanha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Link de Cadastro
          </Button>
        </div>
      </div>

      {/* Regra de Segurança */}
      <div className="p-3.5 rounded-xl border bg-muted/30 flex items-start gap-3 text-xs leading-relaxed">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Resolução Segura de Benefícios</p>
          <p className="text-muted-foreground mt-0.5">
            O frontend nunca decide planos, dias de trial ou créditos via parâmetros arbitrários da query string. O cadastro envia apenas o token da oferta para validação atômica no backend pelo <code>SignupOfferService</code>.
          </p>
        </div>
      </div>

      {/* Tabela de Links */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Links e Campanhas Ativas</CardTitle>
              <CardDescription className="text-xs">
                Tokens gerados, benefícios concedidos e volume de cadastros convertidos.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {offers.length} links cadastrados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Campanha / Nome</TableHead>
                <TableHead>Token Seguro</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead>Bônus Aplicado</TableHead>
                <TableHead>Resgates</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => {
                const isCopied = copiedId === offer.id;
                return (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium text-xs text-foreground">
                      <div>
                        <span>{offer.name}</span>
                        {offer.campaign && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <Tag className="h-3 w-3" />
                            <span>{offer.campaign}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded border">{offer.token}</span>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {offer.trial_enabled ? (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                          <Timer className="h-3.5 w-3.5" />
                          {offer.trial_days} dias
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sem trial</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-medium text-purple-600 dark:text-purple-400">
                      {offer.bonus_credits !== null
                        ? `R$ ${offer.bonus_credits.toFixed(2)} (Especial)`
                        : "Bônus Global (R$ 5,00)"}
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-mono">
                      {offer.redemption_count}
                      {offer.max_redemptions ? ` / ${offer.max_redemptions}` : " (Ilimitado)"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {offer.expires_at ? format(new Date(offer.expires_at), "dd/MM/yyyy") : "Sem expiração"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={offer.status === "active" ? "default" : "secondary"}
                        className={offer.status === "active" ? "bg-emerald-600" : ""}
                      >
                        {offer.status === "active" ? "Ativo" : "Pausado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(offer.token, offer.id)}
                          className="h-8 text-xs gap-1.5"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copiar Link
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(offer)}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {offer.status === "active" ? "Pausar" : "Ativar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Criação de Link de Cadastro */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Criar Link de Cadastro Promocional
            </DialogTitle>
            <DialogDescription className="text-xs">
              Gere um link com benefícios definidos (trial, bônus customizado e plano Qualify).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da Campanha / Link</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Campanha Black Friday ou Instagram Bio"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Plano Vinculado ao Cadastro</Label>
              <Select
                value={formPlanId}
                onValueChange={(val) => {
                  setFormPlanId(val);
                  const p = plans.find((plan) => plan.id === val);
                  if (p) setFormTrialDays(String(p.trial_days));
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — R$ {p.price.toFixed(2)}/mês ({p.trial_days}d teste)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Token da URL (Identificador único)</Label>
              <Input
                value={formToken}
                onChange={(e) => setFormToken(e.target.value)}
                placeholder="Ex: blackfriday-2026"
                className="h-9 font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                URL gerada: <code>/cadastro?offer={formToken || "seu-token"}</code>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Habilitar Trial?</Label>
                  <Switch
                    checked={formTrialEnabled}
                    onCheckedChange={setFormTrialEnabled}
                  />
                </div>
                {formTrialEnabled && (
                  <div className="pt-1">
                    <Label className="text-[11px] text-muted-foreground">Dias de Trial</Label>
                    <Input
                      type="number"
                      value={formTrialDays}
                      onChange={(e) => setFormTrialDays(e.target.value)}
                      className="h-8 mt-1 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Créditos Bônus (R$)</Label>
                <Input
                  type="number"
                  step="1.00"
                  value={formBonus}
                  onChange={(e) => setFormBonus(e.target.value)}
                  placeholder="Ex: 20.00"
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Sobrescreve o bônus global de R$ 5,00 para este link.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Máximo de Cadastros (Opcional)</Label>
                <Input
                  type="number"
                  value={formMaxRedemptions}
                  onChange={(e) => setFormMaxRedemptions(e.target.value)}
                  placeholder="Ex: 50 (em branco = ilimitado)"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Data de Expiração (Opcional)</Label>
                <Input
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tag de Campanha / Origem</Label>
              <Input
                value={formCampaign}
                onChange={(e) => setFormCampaign(e.target.value)}
                placeholder="Ex: youtube-parceiro, meta-ads"
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOffer}>Criar Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
