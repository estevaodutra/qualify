import { useState, useMemo } from "react";
import { useAdminCompanies } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Gauge,
  AlertTriangle,
  Search,
  Building2,
  DollarSign,
  Sparkles,
  Radio,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (n: number) => n.toLocaleString("pt-BR");

export default function AdminUsage() {
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useAdminCompanies();
  const [search, setSearch] = useState("");

  // Empresas próximas do limite (saldo < 50 ou <= 0)
  const nearLimitCompanies = useMemo(() => {
    return companies.filter((c) => (c.balance ?? 0) <= 50);
  }, [companies]);

  // Totais consolidados
  const totalBalance = companies.reduce((acc, c) => acc + (c.balance ?? 0), 0);
  const totalConsumption = companies.reduce((acc, c) => acc + (c.month_consumption ?? 0), 0);

  const filtered = useMemo(() => {
    return companies
      .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.month_consumption ?? 0) - (a.month_consumption ?? 0));
  }, [companies, search]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Uso &amp; Limites Globais</h1>
            <Badge variant="outline" className="text-xs">
              Monitoramento de Franquias
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe o saldo remanescente, consumo financeiro e limites operacionais das empresas.
          </p>
        </div>
      </div>

      {/* Cards Consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Saldo Total em Carteiras</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">{fmtBrl(totalBalance)}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total depositado pelas empresas</p>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Consumo do Mês (Total)</span>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-destructive">{fmtBrl(totalConsumption)}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Disparos e infraestrutura</p>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Empresas no Limite</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-600">{nearLimitCompanies.length}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Saldo zerado ou abaixo de R$ 50</p>
        </Card>
      </div>

      {/* Alerta de Empresas Críticas */}
      {nearLimitCompanies.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/[0.03]">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Empresas com Limite Crítico ou Esgotado ({nearLimitCompanies.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Contas que podem sofrer interrupção nos envios de WhatsApp ou nas chamadas de IA.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y text-xs">
              {nearLimitCompanies.slice(0, 5).map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between hover:bg-muted/40">
                  <div>
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <span className="ml-2 text-muted-foreground text-[11px]">{c.owner_email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold ${(c.balance ?? 0) <= 0 ? "text-destructive" : "text-amber-600"}`}>
                      {fmtBrl(c.balance ?? 0)}
                    </span>
                    <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                      <Link to={`/admin/empresas/${c.id}`}>Ajustar Saldo</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Consumo por Empresa */}
      <Card>
        <CardHeader className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Consumo Detalhado por Empresa
            </CardTitle>
            <CardDescription className="text-xs">Ordenado pelo maior consumo no ciclo atual</CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filtrar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-muted/40">
                  <TableHead className="font-semibold">Empresa</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-right">Saldo Disponível</TableHead>
                  <TableHead className="font-semibold text-right">Consumo no Mês</TableHead>
                  <TableHead className="font-semibold text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <div className="font-semibold text-foreground">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">{c.owner_email || "Sem email"}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.is_active ? "outline" : "secondary"} className="text-[10px]">
                        {c.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      <span className={(c.balance ?? 0) <= 0 ? "text-destructive font-bold" : ""}>
                        {fmtBrl(c.balance ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-destructive">
                      {fmtBrl(c.month_consumption ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                        <Link to={`/admin/empresas/${c.id}`}>Detalhes →</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
