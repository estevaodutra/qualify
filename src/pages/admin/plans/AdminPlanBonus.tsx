import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAdminCompanies } from "@/hooks/useAdmin";
import { billingStore } from "@/services/billing/billingStore";
import { CreditService } from "@/services/billing/creditService";
import { CreditBonusSettings, ConsumptionPriority, ExpirationType } from "@/services/billing/types";
import {
  Gift,
  Plus,
  Save,
  ShieldCheck,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminPlanBonus() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { data: companies = [] } = useAdminCompanies();

  const [settings, setSettings] = useState<CreditBonusSettings>(() =>
    billingStore.getBonusSettings()
  );
  const [isSaving, setIsSaving] = useState(false);

  // Manual Grant Modal
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [grantAmount, setGrantAmount] = useState<string>("10.00");
  const [grantReason, setGrantReason] = useState<string>("Compensação por instabilidade");
  const [grantDays, setGrantDays] = useState<string>("30");
  const [grantNote, setGrantNote] = useState<string>("");
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);

  // Read transactions that are bonus grants
  const [transactions, setTransactions] = useState(() =>
    billingStore.getTransactions().filter((t) => t.type === "bonus")
  );

  // Open modal if query param has company
  useEffect(() => {
    const compParam = searchParams.get("company");
    if (compParam) {
      setSelectedCompany(compParam);
      setIsGrantOpen(true);
    }
  }, [searchParams]);

  const handleSaveSettings = () => {
    setIsSaving(true);
    try {
      const updated = billingStore.saveBonusSettings(settings, "Super Admin");
      setSettings(updated);
      toast({
        title: "Configurações de bônus salvas!",
        description: `Bônus de R$ ${settings.default_bonus_amount.toFixed(2)} (${settings.consumption_priority}) atualizado.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGrantBonus = () => {
    const val = parseFloat(grantAmount);
    if (!selectedCompany) {
      toast({
        title: "Selecione uma empresa",
        description: "Escolha a empresa destinatária do bônus promocional.",
        variant: "destructive",
      });
      return;
    }
    if (isNaN(val) || val <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor do bônus deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingGrant(true);
    try {
      const days = parseInt(grantDays, 10);
      const expiresAt =
        !isNaN(days) && days > 0
          ? new Date(Date.now() + days * 86400000).toISOString()
          : null;

      CreditService.addBonusCredits(selectedCompany, val, grantReason, {
        createdBy: "Super Admin",
        expiresAt,
        note: grantNote,
      });

      // Refresh list
      setTransactions(billingStore.getTransactions().filter((t) => t.type === "bonus"));

      const companyName =
        companies.find((c) => c.id === selectedCompany)?.name || selectedCompany;

      toast({
        title: "Bônus concedido com sucesso!",
        description: `R$ ${val.toFixed(2)} creditados para '${companyName}'. Transação registrada no ledger.`,
      });

      setIsGrantOpen(false);
      setGrantNote("");
    } catch (e: any) {
      toast({
        title: "Erro ao conceder bônus",
        description: e.message || "Falha na concessão de bônus.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Créditos Bônus</h1>
            <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-medium">
              Promocional &bull; Não-Sacável
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure o bônus de boas-vindas para novos cadastros e realize concessões manuais com registro no ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsGrantOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Conceder Bônus Manual
          </Button>
        </div>
      </div>

      {/* Regras e Diretrizes de Compliance */}
      <div className="p-4 rounded-xl border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 flex items-start gap-3.5">
        <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-foreground text-sm">Diretrizes de Segurança dos Créditos Bônus</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground pt-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span><strong>non_withdrawable:</strong> Não pode ser sacado em dinheiro.</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span><strong>non_transferable:</strong> Intransferível entre empresas ou contas.</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span><strong>platform_use_only:</strong> Apenas consumo interno em recursos de IA/telefonia.</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span><strong>subscription_disallowed:</strong> Não paga a mensalidade de R$ 197 do plano.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Configuração Global: Bônus de Boas-Vindas */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Crédito Bônus de Boas-Vindas (Global)</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="gap-1.5 h-8 text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </div>
          <CardDescription className="text-xs">
            Creditado automaticamente na carteira de cada empresa recém-criada ao concluir o cadastro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Bônus Ativo?</Label>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Habilita a concessão de saldo na abertura da conta.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Valor do Bônus (R$)</Label>
              <Input
                type="number"
                step="0.50"
                value={settings.default_bonus_amount}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_bonus_amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground">Ex: R$ 5,00 por nova empresa cadastrada.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Validade do Bônus</Label>
              <Select
                value={settings.expiration_type}
                onValueChange={(val: ExpirationType) =>
                  setSettings({ ...settings, expiration_type: val })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem validade (não expira)</SelectItem>
                  <SelectItem value="days_after_signup">30 dias após cadastro</SelectItem>
                  <SelectItem value="fixed_date">Data fixa</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Expiração gera débito e log no ledger.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Ordem de Consumo</Label>
              <Select
                value={settings.consumption_priority}
                onValueChange={(val: ConsumptionPriority) =>
                  setSettings({ ...settings, consumption_priority: val })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonus_first">Bônus primeiro (Recomendado)</SelectItem>
                  <SelectItem value="purchased_first">Saldo comprado primeiro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Prioridade ao debitar chamadas de IA.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Bônus Concedidos */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Histórico de Concessões de Bônus</CardTitle>
              <CardDescription className="text-xs">
                Auditoria de bônus de boas-vindas e concessões manuais aprovadas no sistema.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {transactions.length} registros
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Data / Hora</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Motivo / Descrição</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Valor Bônus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                    Nenhum bônus concedido ainda.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const compName =
                    companies.find((c) => c.id === tx.company_id)?.name || tx.company_id;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{compName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground max-w-md truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.created_by || "Sistema"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.expires_at ? format(new Date(tx.expires_at), "dd/MM/yyyy") : "Sem validade"}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
                        + R$ {tx.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Concessão Manual */}
      <Dialog open={isGrantOpen} onOpenChange={setIsGrantOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              Adicionar Bônus Manual à Empresa
            </DialogTitle>
            <DialogDescription className="text-xs">
              Conceda créditos bônus para testes ou compensações. Toda concessão gera entrada auditável no ledger de créditos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa Destinatária</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.is_active ? "Ativa" : "Inativa"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor do Bônus (R$)</Label>
                <Input
                  type="number"
                  step="1.00"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  className="h-9 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Validade (Dias)</Label>
                <Input
                  type="number"
                  value={grantDays}
                  onChange={(e) => setGrantDays(e.target.value)}
                  placeholder="Ex: 30 (0 = sem validade)"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Motivo da Concessão</Label>
              <Select value={grantReason} onValueChange={setGrantReason}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Compensação por instabilidade">Compensação por instabilidade</SelectItem>
                  <SelectItem value="Amostra comercial / Degustação">Amostra comercial / Degustação</SelectItem>
                  <SelectItem value="Bonificação de parceria VIP">Bonificação de parceria VIP</SelectItem>
                  <SelectItem value="Ajuste operacional de suporte">Ajuste operacional de suporte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observação Interna (Auditável)</Label>
              <Textarea
                rows={2}
                value={grantNote}
                onChange={(e) => setGrantNote(e.target.value)}
                placeholder="Detalhes adicionais para histórico do financeiro..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGrantOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGrantBonus}
              disabled={isSubmittingGrant}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmittingGrant ? "Processando..." : "Conceder Bônus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
