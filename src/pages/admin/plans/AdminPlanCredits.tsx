import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdminCompanies } from "@/hooks/useAdmin";
import { billingStore } from "@/services/billing/billingStore";
import { CreditRate, CreditWallet } from "@/services/billing/types";
import {
  Coins,
  DollarSign,
  TrendingDown,
  Gift,
  ShieldCheck,
  Save,
  Building2,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminPlanCredits() {
  const { toast } = useToast();
  const { data: companies = [] } = useAdminCompanies();
  const [rates, setRates] = useState<CreditRate[]>(() => billingStore.getRates());
  const [wallets, setWallets] = useState<CreditWallet[]>(() => billingStore.getWallets());
  const [isSavingRates, setIsSavingRates] = useState(false);

  // Sync wallets with companies if any are missing
  const enrichedWallets = companies.map((comp) => {
    const existing = wallets.find((w) => w.company_id === comp.id);
    if (existing) {
      return { ...existing, companyName: comp.name };
    }
    return {
      id: "w_" + comp.id,
      company_id: comp.id,
      companyName: comp.name,
      purchased_balance: 0,
      bonus_balance: 0,
      total_available: 0,
      updated_at: new Date().toISOString(),
    };
  });

  // Calculate aggregates
  const totalPurchased = wallets.reduce((acc, w) => acc + w.purchased_balance, 0);
  const totalBonus = wallets.reduce((acc, w) => acc + w.bonus_balance, 0);
  const totalAvailable = totalPurchased + totalBonus;

  const handleRateChange = (id: string, newRate: number) => {
    const updated = rates.map((r) => (r.id === id ? { ...r, credits_per_unit: newRate } : r));
    setRates(updated);
  };

  const handleSaveRates = () => {
    setIsSavingRates(true);
    try {
      billingStore.saveRates(rates, "Super Admin");
      toast({
        title: "Tabela de tarifas salva!",
        description: "Os custos por recurso foram atualizados no motor de tarifação.",
      });
    } finally {
      setIsSavingRates(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Carteiras &amp; Tarifação de Créditos</h1>
            <Badge variant="outline" className="text-xs">Custódia &amp; Ledger</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Supervisão de saldo comprado versus bônus concedidos e definição das taxas por consumo de IA/telefonia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/planos/bonus">
            <Button variant="outline" className="gap-2">
              <Gift className="h-4 w-4" />
              Conceder Bônus
            </Button>
          </Link>
          <Button onClick={handleSaveRates} disabled={isSavingRates} className="gap-2">
            <Save className="h-4 w-4" />
            {isSavingRates ? "Salvando..." : "Salvar Tarifas"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Saldo Total em Custódia</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              R$ {totalAvailable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Disponível para consumo em IA e mídia</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Coins className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Créditos Comprados</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              R$ {totalPurchased.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Recargas aprovadas via cartão/PIX</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Créditos Bônus Ativos</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
              R$ {totalBonus.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Promocionais &bull; Não sacáveis</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Gift className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Tabela de Tarifas por Recurso */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Tabela de Tarifação por Recurso</CardTitle>
              <CardDescription className="text-xs">
                Valores deduzidos automaticamente da carteira da empresa a cada requisição ou minuto executado.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[11px]">credit_rates</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Recurso / Categoria</TableHead>
                <TableHead>Chave Técnica</TableHead>
                <TableHead>Unidade de Consumo</TableHead>
                <TableHead className="w-[180px]">Custo (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{rate.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{rate.resource_key}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{rate.unit_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={rate.credits_per_unit}
                        onChange={(e) => handleRateChange(rate.id, parseFloat(e.target.value) || 0)}
                        className="h-8 w-24 text-xs font-semibold"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Visão de Carteiras por Empresa */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Saldos de Carteiras por Empresa</CardTitle>
              <CardDescription className="text-xs">
                Saldos segregados (Comprado vs Bônus Promocional).
              </CardDescription>
            </div>
            <Link to="/admin/planos/historico">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Ver Histórico Completo
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Saldo Comprado</TableHead>
                <TableHead className="text-right">Saldo Bônus</TableHead>
                <TableHead className="text-right font-semibold">Total Disponível</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedWallets.map((w) => (
                <TableRow key={w.company_id}>
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{w.companyName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                    R$ {w.purchased_balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-purple-600 dark:text-purple-400">
                    R$ {w.bonus_balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-foreground">
                    R$ {w.total_available.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/admin/planos/bonus?company=${w.company_id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        Adicionar Bônus
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
