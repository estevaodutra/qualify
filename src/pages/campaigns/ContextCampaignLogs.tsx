import { useState } from "react";
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
  ArrowLeft
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

const ContextCampaignLogs = () => {
  const navigate = useNavigate();
  const { executions, isLoading, refetch, deleteExecution } = useContextExecutions();
  const [selectedLog, setSelectedLog] = useState<ContextExecution | null>(null);

  const getStatusBadge = (status: ContextExecution["status"]) => {
    switch (status) {
      case "collecting":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 flex gap-1 items-center">
          <Clock className="w-3 h-3 animate-spin" /> Coletando
        </Badge>;
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 flex gap-1 items-center">
          <CheckCircle2 className="w-3 h-3" /> Concluído
        </Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 flex gap-1 items-center">
          <XCircle className="w-3 h-3" /> Falhou
        </Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Histórico de Execuções
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe todas as coletas de contexto realizadas nos seus grupos.
            </p>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={() => refetch()} 
          disabled={isLoading}
          className="rounded-full px-6"
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-muted/50 h-24" />
          ))
        ) : executions?.length === 0 ? (
          <Card className="border-dashed py-20 text-center bg-primary/5">
            <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-medium">Nenhum log encontrado</h3>
            <p className="text-muted-foreground mt-2">As execuções aparecerão aqui conforme as janelas forem fechadas.</p>
          </Card>
        ) : (
          executions?.map((log) => (
            <Card key={log.id} className="group hover:border-primary/20 transition-all duration-300 shadow-sm hover:shadow-md bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                  {/* Status & Name */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(log.status)}
                      <h3 className="font-bold text-lg">{log.campaign?.name || "Campanha Removida"}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(log.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {log.trigger_message.length > 30 ? log.trigger_message.substring(0, 30) + '...' : log.trigger_message}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-full border-primary/10 hover:bg-primary/5"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="w-4 h-4 mr-2" /> Detalhes
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full text-destructive hover:bg-destructive/10"
                      onClick={() => deleteExecution.mutate(log.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
                  <Label className="text-primary font-bold">Resumo Gerado</Label>
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 whitespace-pre-wrap leading-relaxed text-sm">
                    {selectedLog.result_payload.summary}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground">Resposta do Webhook</Label>
                <div className="p-4 rounded-2xl bg-zinc-950 font-mono text-xs text-zinc-400 overflow-x-auto">
                  <pre>{JSON.stringify(selectedLog.result_payload || {}, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Internal label component just in case
const Label = ({ children, className = "" }: { children: any, className?: string }) => (
  <p className={`text-sm font-medium ${className}`}>{children}</p>
);

export default ContextCampaignLogs;
