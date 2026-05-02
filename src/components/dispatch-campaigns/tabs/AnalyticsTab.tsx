import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, CheckCircle, Eye, XCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface AnalyticsTabProps {
  campaignId: string;
}

export function AnalyticsTab({ campaignId }: AnalyticsTabProps) {
  // Mock data — will be connected to dispatch_sequence_logs in production
  const metrics = {
    sent: 1250,
    delivered: 1180,
    read: 890,
    failed: 70,
  };

  const dailyData = [
    { name: "Seg", enviadas: 180 },
    { name: "Ter", enviadas: 210 },
    { name: "Qua", enviadas: 165 },
    { name: "Qui", enviadas: 240 },
    { name: "Sex", enviadas: 195 },
    { name: "Sáb", enviadas: 150 },
    { name: "Dom", enviadas: 110 },
  ];

  const cards = [
    { label: "Enviadas", value: metrics.sent, icon: Send, color: "text-primary" },
    { label: "Entregues", value: metrics.delivered, pct: ((metrics.delivered / metrics.sent) * 100).toFixed(1), icon: CheckCircle, color: "text-green-500" },
    { label: "Lidas", value: metrics.read, pct: ((metrics.read / metrics.sent) * 100).toFixed(1), icon: Eye, color: "text-blue-500" },
    { label: "Falhas", value: metrics.failed, pct: ((metrics.failed / metrics.sent) * 100).toFixed(1), icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(({ label, value, pct, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${color}`} />
                <span className="text-2xl font-bold">{value.toLocaleString()}</span>
              </div>
              {pct && <p className="text-xs text-muted-foreground mt-1">{pct}%</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Envios por Dia</CardTitle>
          <CardDescription>Volume de mensagens enviadas por dia da semana.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="enviadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
