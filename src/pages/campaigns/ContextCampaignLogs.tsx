import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  Trash2, 
  RefreshCcw, 
  MessageSquare, 
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ArrowLeft,
  Search,
  Filter
} from "lucide-react";
import { useContextExecutions, ContextExecution } from "@/hooks/useContextCampaigns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm font-medium ${className}`}>{children}</p>
);

const ContextCampaignLogs = () => {
  const navigate = useNavigate();
  const { executions, isLoading, refetch, deleteExecution } = useContextExecutions();
  const [selectedLog, setSelectedLog] = useState<ContextExecution | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Keep modal data fresh when executions list updates (e.g. "collecting" → "completed")
  useEffect(() => {
    if (selectedLog && executions) {
      const updated = executions.find(e => e.id === selectedLog.id);
      if (updated) setSelectedLog(updated);
    }
  }, [executions]);

  const filteredExecutions = executions?.filter(ex => 
    ex.campaign?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.trigger_message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: ContextExecution["status"]) => {
    switch (status) {
      case "collecting":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1">
          <Clock className="w-3 h-3 animate-spin" /> Coletando
        </Badge>;
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
          <CheckCircle2 className="w-3 h-3" /> Concluído
        </Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
          <XCircle className="w-3 h-3" /> Falhou
        </Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Logs de Contexto
            </h1>
            <p className="text-muted-foreground mt-1">Histórico detalhado de todas as janelas de coleta.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar nos logs..." 
              className="pl-10 rounded-full bg-background/50" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="rounded-full">
            <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Card className="border-primary/10 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary/5 text-xs uppercase font-bold tracking-wider text-muted-foreground border-b border-primary/5">
                  <th className="px-6 py-4">Início / Campanha</th>
                  <th className="px-6 py-4">Gatilho</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Duração</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-muted rounded w-full" /></td>
                    </tr>
                  ))
                ) : filteredExecutions?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground">
                      Nenhum log encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredExecutions?.map((log) => (
                    <tr key={log.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{log.campaign?.name || "---"}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-sm truncate opacity-80" title={log.trigger_message}>
                          {log.trigger_message}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-muted-foreground">
                          {log.status === "collecting" ? "---" : 
                            `${Math.round((new Date(log.end_at).getTime() - new Date(log.start_at).getTime()) / 60000)} min`
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full hover:bg-primary/10 text-primary"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteExecution.mutate(log.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto backdrop-blur-xl bg-background/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Detalhes da Execução
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-primary/5 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Início</p>
                  <p className="font-medium">{format(new Date(selectedLog.start_at), "HH:mm:ss (dd/MM)", { locale: ptBR })}</p>
                </div>
                <div className="p-4 rounded-2xl bg-primary/5 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Fim</p>
                  <p className="font-medium">{format(new Date(selectedLog.end_at), "HH:mm:ss (dd/MM)", { locale: ptBR })}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Mensagem de Gatilho</Label>
                <div className="p-4 rounded-2xl border border-primary/10 bg-muted/30 italic">
                  "{selectedLog.trigger_message}"
                </div>
              </div>

              {selectedLog.result_payload?.summary && (
                <div className="space-y-2">
                  <Label className="text-primary font-bold">Resumo</Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(selectedLog.result_payload.summary).map(([k, v]) => (
                      <div key={k} className="flex justify-between px-3 py-1.5 rounded-lg bg-primary/5">
                        <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground">Payload do Webhook</Label>
                <div className="p-4 rounded-2xl bg-zinc-950 font-mono text-xs text-zinc-400 overflow-x-auto max-h-48">
                  <pre>{selectedLog.result_payload
                    ? JSON.stringify(selectedLog.result_payload, null, 2)
                    : selectedLog.status === "collecting"
                      ? "⏳ Aguardando fim da janela de coleta..."
                      : "Sem dados"
                  }</pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContextCampaignLogs;
