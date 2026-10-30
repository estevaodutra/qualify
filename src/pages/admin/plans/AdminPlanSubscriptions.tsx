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
import { useToast } from "@/hooks/use-toast";
import { useAdminCompanies } from "@/hooks/useAdmin";
import { billingStore } from "@/services/billing/billingStore";
import { Subscription, SubscriptionStatus } from "@/services/billing/types";
import {
  Receipt,
  Search,
  Building2,
  Calendar,
  CreditCard,
  Coins,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function AdminPlanSubscriptions() {
  const { toast } = useToast();
  const { data: companies = [] } = useAdminCompanies();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() =>
    billingStore.getSubscriptions()
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const wallets = billingStore.getWallets();

  // Combine data
  const enrichedSubs = subscriptions.map((sub) => {
    const comp = companies.find((c) => c.id === sub.company_id);
    const wallet = wallets.find((w) => w.company_id === sub.company_id);
    return {
      ...sub,
      companyName: comp?.name || sub.company_name || sub.company_id,
      purchased: wallet?.purchased_balance ?? 0,
      bonus: wallet?.bonus_balance ?? 0,
      totalCredits: (wallet?.purchased_balance ?? 0) + (wallet?.bonus_balance ?? 0),
    };
  });

  const filteredSubs = enrichedSubs.filter((sub) => {
    const matchStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchSearch =
      searchTerm === "" ||
      sub.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-600 text-white font-normal">Ativa</Badge>;
      case "trialing":
        return <Badge className="bg-blue-600 text-white font-normal">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive" className="font-normal">Inadimplente</Badge>;
      case "canceled":
        return <Badge variant="secondary" className="font-normal">Cancelada</Badge>;
      case "suspended":
        return <Badge variant="outline" className="text-amber-600 border-amber-300 font-normal">Suspensa</Badge>;
      case "expired":
        return <Badge variant="outline" className="text-muted-foreground font-normal">Expirada</Badge>;
    }
  };

  const handleUpdateStatus = (subId: string, newStatus: SubscriptionStatus) => {
    const target = subscriptions.find((s) => s.id === subId);
    if (!target) return;

    const updated = { ...target, status: newStatus };
    billingStore.saveSubscription(updated, "Super Admin");
    setSubscriptions(billingStore.getSubscriptions());

    toast({
      title: "Status da assinatura atualizado",
      description: `A assinatura foi alterada para: ${newStatus}.`,
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Assinaturas</h1>
            <Badge variant="outline" className="text-xs">Ciclo de Vida do Cliente</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe o status financeiro de cada empresa, vigência do trial, renovações e métodos de pagamento.
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-full sm:w-48 text-xs">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="trialing">Em Trial</SelectItem>
              <SelectItem value="past_due">Inadimplentes (Past Due)</SelectItem>
              <SelectItem value="canceled">Canceladas</SelectItem>
              <SelectItem value="suspended">Suspensas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Assinaturas */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Assinaturas e Contratos</CardTitle>
              <CardDescription className="text-xs">
                Visão consolidada da carteira de empresas cadastradas no plano Qualify.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredSubs.length} de {subscriptions.length} empresas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mensalidade</TableHead>
                <TableHead>Trial / Término</TableHead>
                <TableHead>Próx. Cobrança</TableHead>
                <TableHead>Forma de Pagamento</TableHead>
                <TableHead className="text-right">Créditos (Custódia)</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                    Nenhuma assinatura encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubs.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[160px]">{sub.companyName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-medium">
                      {sub.plan_name || "Qualify"}
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="text-xs font-mono">
                      R$ {sub.price_snapshot.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.trial_ends_at
                        ? format(new Date(sub.trial_ends_at), "dd/MM/yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {sub.current_period_end
                        ? format(new Date(sub.current_period_end), "dd/MM/yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.payment_method_last4 ? (
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>
                            {sub.payment_method_brand || "Cartão"} •••• {sub.payment_method_last4}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Não cadastrado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      <div>
                        <span className="font-bold text-foreground">
                          R$ {sub.totalCredits.toFixed(2)}
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          Comp: R${sub.purchased.toFixed(0)} | Bônus: R${sub.bonus.toFixed(0)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/admin/empresas/${sub.company_id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Empresa
                          </Button>
                        </Link>
                        {sub.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateStatus(sub.id, "suspended")}
                            className="h-7 text-xs text-amber-600 hover:text-amber-700"
                          >
                            Suspender
                          </Button>
                        )}
                        {sub.status === "suspended" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateStatus(sub.id, "active")}
                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                          >
                            Reativar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
