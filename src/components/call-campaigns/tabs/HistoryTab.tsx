import { useCallLogs } from "@/hooks/useCallLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, Calendar, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MetricCard } from "@/components/dispatch";

interface HistoryTabProps {
  campaignId: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function HistoryTab({ campaignId }: HistoryTabProps) {
  const { logs, stats, isLoading } = useCallLogs(campaignId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total de Ligações"
          value={stats.totalCalls}
          icon={Phone}
        />
        <MetricCard
          title="Duração Média"
          value={formatDuration(stats.avgDuration)}
          icon={Clock}
        />
        <MetricCard
          title="Hoje"
          value={stats.completedToday}
          icon={Calendar}
        />
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Phone className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma ligação registrada</h3>
          <p className="text-muted-foreground">
            O histórico de ligações aparecerá aqui quando os operadores começarem a ligar.
          </p>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ligações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const hasAutomation = log.notes?.includes("[Automação]");
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{formatDuration(log.durationSeconds)}</TableCell>
                      <TableCell>
                        {log.actionName ? (
                          <Badge
                            variant="secondary"
                            className="text-xs gap-1"
                            style={{ borderColor: log.actionColor || undefined }}
                          >
                            {hasAutomation && <Zap className="h-3 w-3" />}
                            <span
                              className="h-2 w-2 rounded-full inline-block"
                              style={{ backgroundColor: log.actionColor || "hsl(var(--muted-foreground))" }}
                            />
                            {log.actionName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.notes || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}