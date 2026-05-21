import { useState } from "react";
import { URACampaign } from "@/hooks/useURACampaigns";
import { useURALogs, URALog } from "@/hooks/useURALogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PhoneCall, Clock, DollarSign, Download, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface URAHistoryTabProps {
  campaign: URACampaign;
}

export function URAHistoryTab({ campaign }: URAHistoryTabProps) {
  const { toast } = useToast();
  const { logs, stats, isLoading } = useURALogs(campaign.id);

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    try {
      const headers = ["Telefone", "Início", "Fim", "Duração (s)", "Status", "Causa", "Tecla DTMF", "Custo (R$)"];
      const rows = logs.map((l) => [
        l.phone,
        l.startedAt ? format(new Date(l.startedAt), "yyyy-MM-dd HH:mm:ss") : "",
        l.endedAt ? format(new Date(l.endedAt), "yyyy-MM-dd HH:mm:ss") : "",
        l.durationSeconds ?? 0,
        l.statusName || "",
        l.causeName || "",
        l.dtmfPressed || "",
        l.costValue ?? 0,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `logs-ura-${campaign.name.toLowerCase().replace(/\s+/g, "-")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Logs exportados",
        description: "Os logs foram exportados para CSV com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o arquivo CSV.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Chamadas Disparadas</p>
              <h3 className="text-2xl font-bold font-mono">{stats.totalCalls}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Média de Duração</p>
              <h3 className="text-2xl font-bold font-mono">{stats.avgDuration}s</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Custo Estimado</p>
              <h3 className="text-2xl font-bold font-mono">
                R$ {stats.totalCost.toFixed(2)}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cause distribution */}
        <Card className="border-border shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Resultado das Chamadas
            </CardTitle>
            <CardDescription>Distribuição das ligações por causa de terminação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(stats.causeDistribution).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem dados estatísticos disponíveis.</p>
            ) : (
              Object.entries(stats.causeDistribution).map(([cause, count]) => {
                const percentage = stats.totalCalls > 0 ? (count / stats.totalCalls) * 100 : 0;
                return (
                  <div key={cause} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{cause}</span>
                      <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* DTMF distribution */}
        <Card className="border-border shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Interação do Cliente (Teclas DTMF)
            </CardTitle>
            <CardDescription>Mapeamento de teclas pressionadas nas chamadas atendidas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(stats.dtmfDistribution).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem dados estatísticos disponíveis.</p>
            ) : (
              Object.entries(stats.dtmfDistribution).map(([key, count]) => {
                const percentage = stats.totalCalls > 0 ? (count / stats.totalCalls) * 100 : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{key}</span>
                      <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20">
          <div>
            <CardTitle className="text-base font-semibold">Histórico Detalhado</CardTitle>
            <CardDescription>Logs de todas as chamadas realizadas nesta campanha.</CardDescription>
          </div>
          {logs.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 border-border">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        </CardHeader>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Carregando logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Nenhuma ligação registrada até o momento.</div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Telefone</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Tecla Pressionada</TableHead>
                <TableHead className="text-right">Custo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/10">
                  <TableCell className="font-mono text-xs">{log.phone}</TableCell>
                  <TableCell className="text-sm">
                    {log.startedAt ? format(new Date(log.startedAt), "dd/MM/yyyy HH:mm:ss") : "-"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.durationSeconds != null ? `${log.durationSeconds}s` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border">
                      {log.causeName || "Sem resposta"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.dtmfPressed ? (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 font-bold border-emerald-500/10">
                        Tecla {log.dtmfPressed}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    R$ {(log.costValue || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
