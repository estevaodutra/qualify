import { useAdminDashboard } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Wallet, TrendingUp, TrendingDown, AlertTriangle, UserPlus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { title: "Empresas", value: data.totals.companies, icon: Building2, format: "n" },
    { title: "Usuários", value: data.totals.users, icon: Users, format: "n" },
    { title: "Saldo total", value: data.totals.balance, icon: Wallet, format: "c" },
    { title: "Receita do mês", value: data.totals.monthRevenue, icon: TrendingUp, format: "c" },
    { title: "Consumo do mês", value: data.totals.monthConsumption, icon: TrendingDown, format: "c" },
    { title: "Lucro do mês", value: data.totals.monthProfit, icon: Wallet, format: "c" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.title}
              </CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {c.format === "c" ? fmt(c.value) : c.value.toLocaleString("pt-BR")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receita vs Consumo (30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(new Date(d), "dd/MM")}
                  className="text-xs"
                />
                <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  labelFormatter={(d) => format(new Date(d), "dd/MM/yyyy")}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Recargas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="consumption" name="Consumo" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/empresas" className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm">Empresas com saldo baixo</span>
              </div>
              <span className="text-sm font-bold">{data.alerts.lowBalanceCount}</span>
            </Link>
            <Link to="/admin/usuarios" className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Usuários aguardando acesso</span>
              </div>
              <span className="text-sm font-bold">{data.alerts.awaitingAccessCount}</span>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empresas recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma empresa.</p>
          ) : (
            <ul className="divide-y">
              {data.recentCompanies.map((c: any) => (
                <li key={c.id} className="py-2 flex items-center justify-between">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(c.created_at), "dd/MM/yyyy")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
