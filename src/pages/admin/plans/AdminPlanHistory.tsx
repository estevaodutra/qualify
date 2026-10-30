import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminCompanies } from "@/hooks/useAdmin";
import { billingStore } from "@/services/billing/billingStore";
import { CreditTransaction, AuditLogEntry, TransactionType, WalletType } from "@/services/billing/types";
import {
  History,
  Search,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Coins,
  ShieldCheck,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminPlanHistory() {
  const { data: companies = [] } = useAdminCompanies();
  const [transactions, setTransactions] = useState<CreditTransaction[]>(() =>
    billingStore.getTransactions()
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => billingStore.getAudit());

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredTx = transactions.filter((tx) => {
    const comp = companies.find((c) => c.id === tx.company_id);
    const compName = comp?.name || tx.company_id;

    const matchesSearch =
      searchTerm === "" ||
      compName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesWallet = walletFilter === "all" || tx.wallet_type === walletFilter;
    const matchesType = typeFilter === "all" || tx.type === typeFilter;

    return matchesSearch && matchesWallet && matchesType;
  });

  const getTransactionBadge = (type: TransactionType) => {
    switch (type) {
      case "topup":
        return <Badge className="bg-emerald-600 text-white font-normal">Recarga</Badge>;
      case "bonus":
        return <Badge className="bg-purple-600 text-white font-normal">Bônus</Badge>;
      case "usage":
        return <Badge variant="secondary" className="font-normal text-muted-foreground">Consumo</Badge>;
      case "refund":
        return <Badge className="bg-blue-600 text-white font-normal">Estorno</Badge>;
      case "manual_adjustment":
        return <Badge variant="outline" className="text-amber-600 border-amber-300 font-normal">Ajuste Manual</Badge>;
      case "expiration":
        return <Badge variant="destructive" className="font-normal">Expiração</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Ledger Financeiro &amp; Auditoria</h1>
            <Badge variant="outline" className="text-xs">Rastreabilidade Estrita</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Histórico imutável de transações de créditos, deduções de consumo, bonificações e auditoria de configurações.
          </p>
        </div>
      </div>

      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList className="bg-muted/40 p-1">
          <TabsTrigger value="ledger" className="gap-2 text-xs">
            <Coins className="h-4 w-4" />
            Ledger de Créditos (Transações)
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 text-xs">
            <ShieldCheck className="h-4 w-4" />
            Auditoria de Configurações
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Ledger de Créditos */}
        <TabsContent value="ledger" className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empresa ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={walletFilter} onValueChange={setWalletFilter}>
                <SelectTrigger className="h-9 w-full sm:w-36 text-xs">
                  <SelectValue placeholder="Carteira" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Carteiras</SelectItem>
                  <SelectItem value="purchased">Comprado</SelectItem>
                  <SelectItem value="bonus">Bônus</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-full sm:w-40 text-xs">
                  <SelectValue placeholder="Tipo de Movimentação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="topup">Recarga (Topup)</SelectItem>
                  <SelectItem value="bonus">Bônus Concedido</SelectItem>
                  <SelectItem value="usage">Consumo de IA/Voz</SelectItem>
                  <SelectItem value="refund">Estorno</SelectItem>
                  <SelectItem value="expiration">Expiração</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Livro Razão de Créditos (credit_transactions)</CardTitle>
                  <CardDescription className="text-xs">
                    Nenhum saldo é alterado sem lançamento contábil auditável com saldo anterior e posterior.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {filteredTx.length} registros
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Carteira</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição / Recurso</TableHead>
                    <TableHead className="text-right">Anterior</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Posterior</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhuma movimentação encontrada no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTx.map((tx) => {
                      const comp = companies.find((c) => c.id === tx.company_id);
                      const isPositive = tx.amount >= 0;
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-foreground">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[140px]">{comp?.name || tx.company_id}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                tx.wallet_type === "bonus"
                                  ? "text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950/40 text-[11px]"
                                  : "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/40 text-[11px]"
                              }
                            >
                              {tx.wallet_type === "bonus" ? "Bônus" : "Comprado"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getTransactionBadge(tx.type)}</TableCell>
                          <TableCell className="text-xs text-foreground max-w-sm truncate">
                            {tx.description}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">
                            R$ {tx.balance_before.toFixed(2)}
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs font-bold font-mono ${
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-destructive"
                            }`}
                          >
                            {isPositive ? `+ R$ ${tx.amount.toFixed(2)}` : `- R$ ${Math.abs(tx.amount).toFixed(2)}`}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-medium text-foreground">
                            R$ {tx.balance_after.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Auditoria de Configurações */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Trilha de Auditoria Operacional</CardTitle>
              <CardDescription className="text-xs">
                Registro de alterações críticas em preços, matriz de limites, bônus e trial.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead>Detalhes da Modificação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground font-mono">
                        {log.action}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">
                        {log.entity_type}
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        {log.actor_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
