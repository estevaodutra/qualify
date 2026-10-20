import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Building2,
  Phone,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  useAdminInstanceConnectionLogs,
  useAdminInstances,
  InstanceConnectionLog,
  AdminInstance,
} from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";

interface InstanceConnectionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultInstanceId?: string | null;
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr: string) {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
    if (diffHours > 0) return `há ${diffHours}h`;
    if (diffMin > 0) return `há ${diffMin} min`;
    return "agora mesmo";
  } catch {
    return "";
  }
}

function formatPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function InstanceConnectionHistoryModal({
  isOpen,
  onClose,
  defaultInstanceId,
}: InstanceConnectionHistoryModalProps) {
  const { data: instances = [] } = useAdminInstances();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(
    defaultInstanceId || "all"
  );
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (defaultInstanceId) {
      setSelectedInstanceId(defaultInstanceId);
    } else {
      setSelectedInstanceId("all");
    }
  }, [defaultInstanceId, isOpen]);

  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useAdminInstanceConnectionLogs({
    instanceId: selectedInstanceId,
    eventType: eventTypeFilter,
    limit: 200,
  });

  // Realtime subscription para novos logs de conexão
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel("admin-instance-connection-logs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "instance_connection_logs",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, refetch]);

  const filteredLogs = logs.filter((log: InstanceConnectionLog) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      log.instance_name.toLowerCase().includes(q) ||
      (log.phone || "").toLowerCase().includes(q) ||
      (log.company_name || "").toLowerCase().includes(q) ||
      (log.reason || "").toLowerCase().includes(q) ||
      (log.external_instance_id || "").toLowerCase().includes(q)
    );
  });

  const totalConnected = logs.filter((l) => l.event_type === "connected").length;
  const totalDisconnected = logs.filter((l) => l.event_type === "disconnected").length;
  const lastEvent = logs[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Histórico de Conexões e Desconexões
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Auditoria completa e em tempo real de cada conexão e desconexão das instâncias WhatsApp.
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </DialogHeader>

        {/* Resumo Rápido */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Conexões Registradas</p>
                <p className="text-xl font-bold text-emerald-600">{totalConnected}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-600">
                <Wifi className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Desconexões Registradas</p>
                <p className="text-xl font-bold text-red-600">{totalDisconnected}</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded-full text-red-600">
                <WifiOff className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/40 border-border">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Último Evento</p>
                <p className="text-xs font-semibold truncate">
                  {lastEvent ? `${lastEvent.instance_name} (${lastEvent.event_type === "connected" ? "Conectou" : "Desconectou"})` : "Nenhum ainda"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {lastEvent ? formatRelativeTime(lastEvent.created_at) : "—"}
                </p>
              </div>
              <div className="p-2 bg-muted rounded-full text-muted-foreground flex-shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2.5 items-center mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por instância, telefone, empresa..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder="Todas as instâncias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as instâncias</SelectItem>
              {instances.map((inst: AdminInstance) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Todos os eventos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              <SelectItem value="connected">Apenas Conexões</SelectItem>
              <SelectItem value="disconnected">Apenas Desconexões</SelectItem>
              <SelectItem value="waiting connection">Aguardando Conexão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista / Tabela de Histórico */}
        <div className="flex-1 overflow-y-auto border rounded-lg bg-card min-h-[300px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span>Carregando histórico...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
              <p className="font-medium text-foreground">Nenhum registro de conexão encontrado</p>
              <p className="text-xs">
                As próximas conexões e desconexões serão salvas e exibidas aqui automaticamente.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/60 sticky top-0 border-b z-10">
                <tr className="text-left font-medium text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Data e Hora</th>
                  <th className="py-2.5 px-3">Instância</th>
                  <th className="py-2.5 px-3">Empresa</th>
                  <th className="py-2.5 px-3">Telefone</th>
                  <th className="py-2.5 px-3">Evento</th>
                  <th className="py-2.5 px-3">Status Anterior ➔ Novo</th>
                  <th className="py-2.5 px-3">Motivo / Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map((log: InstanceConnectionLog) => {
                  const isConnected = log.event_type === "connected";
                  const isDisconnected = log.event_type === "disconnected";

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Data e Hora */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-foreground">
                          {formatDate(log.created_at)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(log.created_at)}
                        </div>
                      </td>

                      {/* Instância */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground">
                          {log.instance_name}
                        </div>
                        {log.external_instance_id && (
                          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]" title={log.external_instance_id}>
                            ID: {log.external_instance_id}
                          </div>
                        )}
                      </td>

                      {/* Empresa */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{log.company_name || "—"}</span>
                        </div>
                      </td>

                      {/* Telefone */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-mono text-foreground">
                          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span>{formatPhone(log.phone)}</span>
                        </div>
                      </td>

                      {/* Evento Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isConnected ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1 font-medium hover:bg-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Conectou
                          </Badge>
                        ) : isDisconnected ? (
                          <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1 font-medium hover:bg-red-500/20">
                            <XCircle className="h-3 w-3" /> Desconectou
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 gap-1 font-medium hover:bg-yellow-500/20">
                            <Clock className="h-3 w-3" /> Aguardando
                          </Badge>
                        )}
                      </td>

                      {/* Transição de Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px] font-mono">
                          <span className="text-muted-foreground capitalize">
                            {log.previous_status || "início"}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className={isConnected ? "text-emerald-600 font-semibold capitalize" : "text-red-600 font-semibold capitalize"}>
                            {log.new_status}
                          </span>
                        </div>
                      </td>

                      {/* Motivo */}
                      <td className="py-2.5 px-3">
                        <span className="text-muted-foreground text-[11px]">
                          {log.reason || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Exibindo <strong>{filteredLogs.length}</strong> registro(s)
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
