import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, UserMinus, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useMemberMovement } from "@/hooks/useMemberMovement";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MemberMovementCardProps {
  campaignId: string;
  period: number;
  totalMembers: number;
}

export function MemberMovementCard({ campaignId, period, totalMembers }: MemberMovementCardProps) {
  const { data: stats, isLoading } = useMemberMovement(campaignId, period);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const totalJoined = stats?.totalJoined ?? 0;
  const totalLeft = stats?.totalLeft ?? 0;
  const netChange = stats?.netChange ?? 0;
  const retentionRate = totalMembers > 0
    ? Math.round(((totalMembers - totalLeft) / totalMembers) * 100)
    : 100;

  const chartData = (stats?.dailyStats ?? []).map((d) => ({
    ...d,
    label: format(new Date(d.date), "EEE", { locale: ptBR }),
    fullDate: format(new Date(d.date), "dd/MM"),
  }));

  const cards = [
    {
      title: "Entraram",
      value: totalJoined,
      subtitle: `últimos ${period}d`,
      icon: UserPlus,
      color: "text-green-500",
    },
    {
      title: "Saíram",
      value: totalLeft,
      subtitle: `últimos ${period}d`,
      icon: UserMinus,
      color: "text-destructive",
    },
    {
      title: "Saldo",
      value: `${netChange >= 0 ? "+" : ""}${netChange}`,
      subtitle: `últimos ${period}d`,
      icon: netChange >= 0 ? TrendingUp : TrendingDown,
      color: netChange >= 0 ? "text-green-500" : "text-destructive",
    },
    {
      title: "Taxa de Retenção",
      value: `${retentionRate}%`,
      subtitle: undefined,
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(({ title, value, subtitle, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${color}`} />
                <span className="text-2xl font-bold">{value}</span>
              </div>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimento de Membros</CardTitle>
          <CardDescription>Entradas e saídas por dia no período selecionado.</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados para o período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="fullDate" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.fullDate) return payload[0].payload.fullDate;
                    return "";
                  }}
                />
                <Legend />
                <Bar dataKey="joined" name="Entraram" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="left" name="Saíram" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
