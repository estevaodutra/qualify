import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdminCompanies,
  useCreditManual,
  useDebitManual,
  useAdminTransactions,
  AdminCompany,
} from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Search,
  RefreshCw,
  Sliders,
  DollarSign,
  Building2,
  AlertCircle,
  ExternalLink,
  History,
  TrendingDown,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminWallets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "positive" | "low" | "zero">("all");
  const [selectedCompany, setSelectedCompany] = useState<AdminCompany | null>(null);

  // Modal Ajuste Manual
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("Ajuste Administrativo");
  const [adjustDescription, setAdjustDescription] = useState("");

  // Modal Extrato Específico
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyCompany, setHistoryCompany] = useState<AdminCompany | null>(null);

  // Queries
  const { data: companies, isLoading: loadingCompanies, refetch: refetchCompanies } = useAdminCompanies();
  const creditMutation = useCreditManual();
  const debitMutation = useDebitManual();

  // Transações gerais
  const { data: transactions, isLoading: loadingTx } = useAdminTransactions({ type: "all" });

  // Transações da empresa selecionada no modal
  const { data: companyTx, isLoading: loadingCompanyTx } = useQuery({
    queryKey: ["admin", "company-transactions", historyCompany?.id],
    enabled: !!historyCompany?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("wallet_transactions")
        .select("*")
        .eq("company_id", historyCompany!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Configurações de Tarifação de IA (ai_token_pricing)
  const { data: pricingSetting, isLoading: loadingPricing, refetch: refetchPricing } = useQuery({
    queryKey: ["admin", "platform-settings", "ai_token_pricing"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("value")
        .eq("key", "ai_token_pricing")
        .maybeSingle();
      if (error) throw error;
      return (
        data?.value || {
          usd_to_brl_rate: 6.0,
          markup_multiplier: 2.0,
          min_charge_brl: 0.01,
          billing_enabled: true,
          models: {
            "gpt-4o-mini": { input_cost_per_m_usd: 0.15, output_cost_per_m_usd: 0.60 },
            "gpt-4o": { input_cost_per_m_usd: 2.50, output_cost_per_m_usd: 10.00 },
          },
        }
      );
    },
  });

  // Form de Tarifação
  const [pricingForm, setPricingForm] = useState<any>(null);
  const currentPricing = pricingForm || pricingSetting || {
    usd_to_brl_rate: 6.0,
    markup_multiplier: 2.0,
    min_charge_brl: 0.01,
    billing_enabled: true,
  };

  const updatePricingMutation = useMutation({
    mutationFn: async (newValue: any) => {
      const { error } = await (supabase as any)
        .from("platform_settings")
        .upsert(
          {
            key: "ai_token_pricing",
            value: newValue,
            description: "Configurações de precificação e tarifação de tokens de IA debitados na carteira",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "platform-settings", "ai_token_pricing"] });
      toast.success("Regras de tarifação por token salvas com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar regras: " + err.message);
    },
  });

  // Métricas Consolidadas
  const companyList = companies || [];
  const totalBalance = companyList.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
  const totalReserved = companyList.reduce((acc, c) => acc + (Number(c.reserved_balance) || 0), 0);
  const totalConsumptionMonth = companyList.reduce((acc, c) => acc + (Number(c.month_consumption) || 0), 0);
  const zeroBalanceCount = companyList.filter((c) => (Number(c.balance) || 0) <= 0).length;
  const lowBalanceCount = companyList.filter((c) => (Number(c.balance) || 0) > 0 && (Number(c.balance) || 0) < 20).length;

  // Filtros de Tabela
  const filteredCompanies = companyList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.owner_email && c.owner_email.toLowerCase().includes(searchTerm.toLowerCase()));

    const bal = Number(c.balance) || 0;
    if (balanceFilter === "positive") return matchesSearch && bal > 0;
    if (balanceFilter === "low") return matchesSearch && bal > 0 && bal < 20;
    if (balanceFilter === "zero") return matchesSearch && bal <= 0;
    return matchesSearch;
  });

  // Handlers
  const handleOpenAdjust = (company: AdminCompany, defaultType: "credit" | "debit" = "credit") => {
    setSelectedCompany(company);
    setAdjustType(defaultType);
    setAdjustAmount("");
    setAdjustReason(defaultType === "credit" ? "Bônus Operacional / Recarga" : "Débito / Ajuste");
    setAdjustDescription("");
    setAdjustModalOpen(true);
  };

  const handleOpenHistory = (company: AdminCompany) => {
    setHistoryCompany(company);
    setHistoryModalOpen(true);
  };

  const handleConfirmAdjust = async () => {
    if (!selectedCompany) return;
    const val = parseFloat(adjustAmount);
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor numérico positivo válido.");
      return;
    }

    try {
      if (adjustType === "credit") {
        await creditMutation.mutateAsync({
          company_id: selectedCompany.id,
          amount: val,
          reason: adjustReason,
          description: adjustDescription || undefined,
        });
      } else {
        await debitMutation.mutateAsync({
          company_id: selectedCompany.id,
          amount: val,
          reason: adjustReason,
          description: adjustDescription || undefined,
        });
      }
      setAdjustModalOpen(false);
      refetchCompanies();
    } catch (err) {
      // Já tratado pelo onError da mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Wallet className="h-8 w-8 text-primary" />
            Gestão de Carteiras & Saldos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controle financeiro em tempo real, recargas, consumo de tokens de IA e auditoria de saldos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/integracoes/asaas")}
            className="flex items-center gap-1.5"
          >
            <CreditCard className="h-4 w-4 text-emerald-600" />
            Gateway Asaas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCompanies()}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total em Custódia</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{fmtBRL(totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Reservado: <span className="font-semibold">{fmtBRL(totalReserved)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consumo IA (Mês Atual)</CardTitle>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{fmtBRL(totalConsumptionMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1">Debitado automaticamente por token</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empresas c/ Saldo Baixo</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{lowBalanceCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Saldo entre R$ 0,01 e R$ 20,00</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empresas Zeradas / Bloqueadas</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{zeroBalanceCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Impedidas de executar novas chamadas de IA</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="wallets" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="wallets" className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4" />
            Carteiras
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-1.5">
            <History className="h-4 w-4" />
            Transações
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-1.5">
            <Sliders className="h-4 w-4" />
            Tarifação IA
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CARTEIRAS DAS EMPRESAS */}
        <TabsContent value="wallets" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Carteiras das Empresas Cadastradas</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Visualize o saldo disponível, histórico de débitos por token e faça ajustes administrativos manuais.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar empresa ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                  <Select value={balanceFilter} onValueChange={(v: any) => setBalanceFilter(v)}>
                    <SelectTrigger className="w-36 h-9 text-xs">
                      <SelectValue placeholder="Filtro de Saldo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas ({companyList.length})</SelectItem>
                      <SelectItem value="positive">Com Saldo</SelectItem>
                      <SelectItem value="low">Saldo Baixo (&lt; R$20)</SelectItem>
                      <SelectItem value="zero">Zeradas (R$ 0,00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingCompanies ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Empresa</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Saldo Disponível</TableHead>
                      <TableHead className="text-right">Reservado</TableHead>
                      <TableHead className="text-right">Consumo Mês</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10 text-sm">
                          Nenhuma empresa encontrada com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCompanies.map((c) => {
                        const bal = Number(c.balance) || 0;
                        const isZero = bal <= 0;
                        const isLow = bal > 0 && bal < 20;

                        return (
                          <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                {c.name}
                              </div>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                ID: {c.id.slice(0, 8)}...
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {c.owner_email || "Sem email"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-sm">
                              <span
                                className={
                                  isZero
                                    ? "text-destructive"
                                    : isLow
                                    ? "text-amber-600"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }
                              >
                                {fmtBRL(bal)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {fmtBRL(Number(c.reserved_balance) || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold">
                              {fmtBRL(Number(c.month_consumption) || 0)}
                            </TableCell>
                            <TableCell className="text-center">
                              {isZero ? (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  Sem Saldo
                                </Badge>
                              ) : isLow ? (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] px-1.5 py-0">
                                  Alerta Baixo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px] px-1.5 py-0">
                                  Ativo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleOpenAdjust(c, "credit")}
                                className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                                Creditar
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleOpenAdjust(c, "debit")}
                                className="h-7 text-xs text-destructive hover:text-destructive"
                              >
                                <ArrowDownLeft className="h-3.5 w-3.5 mr-0.5" />
                                Debitar
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => handleOpenHistory(c)}
                                className="h-7 text-xs text-muted-foreground"
                              >
                                <History className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: TRANSAÇÕES GLOBAIS */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Auditoria de Transações e Consumos</CardTitle>
              <CardDescription className="text-xs">
                Extrato unificado de recargas, estornos e débitos automáticos por geração de IA
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingTx ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Data / Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Saldo Posterior</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(transactions || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                          Nenhuma transação registrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (transactions || []).slice(0, 50).map((t: any) => {
                        const amount = Number(t.amount);
                        const isPositive = amount > 0;
                        const isAi = t.category === "ai_generation";

                        return (
                          <TableRow key={t.id} className="hover:bg-muted/30">
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {format(new Date(t.created_at), "dd/MM/yyyy HH:mm:ss")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={isPositive ? "default" : "secondary"}
                                className="text-[10px] uppercase font-bold"
                              >
                                {t.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isAi ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                                  <Sparkles className="h-3 w-3" />
                                  IA Copilot
                                </span>
                              ) : (
                                <span className="text-xs text-foreground font-medium">{t.category || "—"}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs max-w-sm truncate text-muted-foreground font-mono">
                              {t.description || "—"}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono font-bold text-xs ${
                                isPositive ? "text-emerald-600" : "text-destructive"
                              }`}
                            >
                              {isPositive ? `+${fmtBRL(amount)}` : fmtBRL(amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {t.balance_after != null ? fmtBRL(Number(t.balance_after)) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PRECIFICAÇÃO E REGRAS POR TOKEN */}
        <TabsContent value="pricing" className="space-y-4">
          <Card className="border-border/60 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                Precificação & Tarifação de Tokens de IA
              </CardTitle>
              <CardDescription className="text-xs">
                Defina o multiplicador de margem sobre os custos reais da OpenAI e taxa de câmbio USD -&gt; BRL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Débito Automático por Token Ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Quando ligado, desconta da carteira a cada execução de Reel, Carrossel, Legenda e Bio.
                  </p>
                </div>
                <Switch
                  checked={currentPricing.billing_enabled !== false}
                  onCheckedChange={(checked) =>
                    setPricingForm({ ...currentPricing, billing_enabled: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cotação USD para BRL (R$)</Label>
                  <Input
                    type="number"
                    step="0.10"
                    value={currentPricing.usd_to_brl_rate || 6.0}
                    onChange={(e) =>
                      setPricingForm({
                        ...currentPricing,
                        usd_to_brl_rate: parseFloat(e.target.value) || 6.0,
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">Taxa de conversão para cálculo de custo.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Multiplicador de Markup (Margem)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={currentPricing.markup_multiplier || 2.0}
                    onChange={(e) =>
                      setPricingForm({
                        ...currentPricing,
                        markup_multiplier: parseFloat(e.target.value) || 2.0,
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">Ex: 2.0x dobra o custo real da OpenAI.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cobrança Mínima por Geração (R$)</Label>
                  <Input
                    type="number"
                    step="0.005"
                    value={currentPricing.min_charge_brl || 0.01}
                    onChange={(e) =>
                      setPricingForm({
                        ...currentPricing,
                        min_charge_brl: parseFloat(e.target.value) || 0.01,
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">Valor piso debitado se a geração for muito curta.</p>
                </div>
              </div>

              <div className="rounded-md border p-3 bg-muted/10 space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Exemplo Prático de Cobrança:</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para uma geração de <strong>Roteiro de Reel</strong> (500 tokens de entrada + 400 tokens de saída no <code>gpt-4o-mini</code>):
                  <br />
                  • Custo OpenAI: ~US$ 0,000315
                  <br />
                  • Com Dólar a R$ {Number(currentPricing.usd_to_brl_rate || 6).toFixed(2)} e Markup de {Number(currentPricing.markup_multiplier || 2).toFixed(1)}x:
                  <br />
                  • <span className="text-emerald-600 font-bold font-mono">
                    Débito calculado: ~R$ {(0.000315 * Number(currentPricing.usd_to_brl_rate || 6) * Number(currentPricing.markup_multiplier || 2)).toFixed(3)}
                  </span>
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => updatePricingMutation.mutate(currentPricing)}
                  disabled={updatePricingMutation.isPending}
                  className="gap-2"
                >
                  <Sliders className="h-4 w-4" />
                  {updatePricingMutation.isPending ? "Salvando..." : "Salvar Configurações de Tarifação"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: AJUSTE MANUAL (CRÉDITO OU DÉBITO) */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adjustType === "credit" ? (
                <>
                  <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                  Creditar Saldo Manualmente
                </>
              ) : (
                <>
                  <ArrowDownLeft className="h-5 w-5 text-destructive" />
                  Debitar Saldo Manualmente
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Empresa: <strong className="text-foreground">{selectedCompany?.name}</strong> (Saldo Atual:{" "}
              {fmtBRL(Number(selectedCompany?.balance) || 0)})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Ajuste</Label>
              <Select value={adjustType} onValueChange={(v: any) => setAdjustType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Creditar (+) Adicionar Saldo</SelectItem>
                  <SelectItem value="debit">Debitar (-) Reduzir Saldo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor em Reais (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 50.00"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo</Label>
              <Input
                placeholder="Ex: Bônus de adesão, Estorno, Recarga balcão"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observação Complementar (Opcional)</Label>
              <Input
                placeholder="Ex: Chamado #8492 aprovado pelo financeiro"
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAdjust}
              disabled={creditMutation.isPending || debitMutation.isPending}
              variant={adjustType === "credit" ? "default" : "destructive"}
            >
              {creditMutation.isPending || debitMutation.isPending ? "Processando..." : "Confirmar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EXTRATO DA EMPRESA */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Extrato da Empresa: {historyCompany?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Saldo Atual: <strong>{fmtBRL(Number(historyCompany?.balance) || 0)}</strong> • Total Consumido no Mês:{" "}
              <strong>{fmtBRL(Number(historyCompany?.month_consumption) || 0)}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {loadingCompanyTx ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (companyTx || []).length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Nenhuma transação encontrada para esta empresa.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo Após</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(companyTx || []).map((t: any) => {
                    const amount = Number(t.amount);
                    const isPositive = amount > 0;
                    return (
                      <TableRow key={t.id} className="text-xs">
                        <TableCell className="font-mono text-muted-foreground">
                          {format(new Date(t.created_at), "dd/MM HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isPositive ? "default" : "outline"} className="text-[10px]">
                            {t.category || t.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate font-mono text-[11px]">
                          {t.description}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold ${
                            isPositive ? "text-emerald-600" : "text-destructive"
                          }`}
                        >
                          {isPositive ? `+${fmtBRL(amount)}` : fmtBRL(amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {t.balance_after != null ? fmtBRL(Number(t.balance_after)) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
