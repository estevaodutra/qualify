import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallOperators, CallOperator, OperatorStatus } from "@/hooks/useCallOperators";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Search, User, Phone, Clock, Pause, Wifi, WifiOff, Settings, Trash2, Users, Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CreateOperatorDialog } from "./CreateOperatorDialog";
import { EditOperatorDialog } from "./EditOperatorDialog";
import { AddOperatorDialog } from "./AddOperatorDialog";
import { useCompany } from "@/contexts/CompanyContext";

const statusConfig: Record<OperatorStatus, { label: string; color: string; icon: React.ReactNode }> = {
  available: { label: "Disponível", color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800", icon: <Wifi className="h-3 w-3" /> },
  on_call: { label: "Em ligação", color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800", icon: <Phone className="h-3 w-3" /> },
  cooldown: { label: "Cooldown", color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800", icon: <Clock className="h-3 w-3" /> },
  paused: { label: "Pausado", color: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800", icon: <Pause className="h-3 w-3" /> },
  offline: { label: "Offline", color: "bg-muted text-muted-foreground border-muted", icon: <WifiOff className="h-3 w-3" /> },
};

function getTimeSince(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora mesmo";
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days > 1 ? "s" : ""} atrás`;
}

export function OperatorsPanel() {
  const { operators, isLoading, removeOperator } = useCallOperators();
  const { isAdmin } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editOperator, setEditOperator] = useState<CallOperator | null>(null);

  const filtered = operators.filter((op) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!op.operatorName.toLowerCase().includes(q) && !op.extension?.includes(q)) return false;
    }
    if (statusFilter !== "all" && op.status !== statusFilter) return false;
    if (activeFilter === "active" && !op.isActive) return false;
    if (activeFilter === "inactive" && op.isActive) return false;
    return true;
  });

  const summary = {
    total: operators.length,
    available: operators.filter((o) => o.status === "available" && o.isActive).length,
    onCall: operators.filter((o) => o.status === "on_call").length,
    offline: operators.filter((o) => o.status === "offline").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Operadores</h2>
          <p className="text-sm text-muted-foreground">Gerencie os operadores de telefonia</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Operador
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<Users className="h-5 w-5 text-muted-foreground" />} label="Total" value={summary.total} />
        <SummaryCard icon={<Wifi className="h-5 w-5 text-emerald-500" />} label="Disponíveis" value={summary.available} />
        <SummaryCard icon={<Phone className="h-5 w-5 text-blue-500" />} label="Em Ligação" value={summary.onCall} />
        <SummaryCard icon={<WifiOff className="h-5 w-5 text-muted-foreground" />} label="Offline" value={summary.offline} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar operador..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="available">Disponível</SelectItem>
            <SelectItem value="on_call">Em ligação</SelectItem>
            <SelectItem value="cooldown">Cooldown</SelectItem>
            <SelectItem value="paused">Pausado</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Ativos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Operator list */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {operators.length === 0 ? "Nenhum operador cadastrado" : "Nenhum operador encontrado"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {operators.length === 0
              ? "Adicione operadores para realizar as ligações das campanhas."
              : "Tente alterar os filtros de busca."}
          </p>
          {operators.length === 0 && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Operador
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((operator) => (
            <OperatorCard
              key={operator.id}
              operator={operator}
              onConfigure={setEditOperator}
              onRemove={(id) => removeOperator(id)}
            />
          ))}
        </div>
      )}

      <CreateOperatorDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <AddOperatorDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      <EditOperatorDialog
        operator={editOperator}
        onClose={() => setEditOperator(null)}
      />
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function OperatorCard({ operator, onConfigure, onRemove }: { operator: CallOperator; onConfigure: (op: CallOperator) => void; onRemove: (id: string) => void }) {
  const { updateOperatorStatus } = useCallOperators();
  const queryClient = useQueryClient();
  const config = statusConfig[operator.status];
  const answerRate = operator.totalCalls > 0
    ? ((operator.totalCallsAnswered / operator.totalCalls) * 100).toFixed(1)
    : null;

  const isToggleDisabled = !operator.isActive;
  const isOnline = operator.status === "available" || operator.status === "on_call" || operator.status === "cooldown";

  const handleToggle = async (checked: boolean) => {
    try {
      if (!checked && operator.status === "on_call") {
        if (!confirm("Operador está em ligação. Deseja forçar offline?")) return;
        if (operator.currentCallId) {
          await (supabase as any).rpc('release_operator', { p_call_id: operator.currentCallId, p_force: true });
        }
        await (supabase as any)
          .from("call_operators")
          .update({ status: "offline" })
          .eq("id", operator.id);
        queryClient.invalidateQueries({ queryKey: ["call_operators"] });
        return;
      }
      if (!checked && operator.status === "cooldown") {
        await (supabase as any)
          .from("call_operators")
          .update({ status: "offline" })
          .eq("id", operator.id);
        queryClient.invalidateQueries({ queryKey: ["call_operators"] });
        return;
      }
      if (checked && operator.status === "cooldown") {
        await (supabase as any)
          .from("call_operators")
          .update({ status: "available", current_call_id: null, current_campaign_id: null })
          .eq("id", operator.id);
        queryClient.invalidateQueries({ queryKey: ["call_operators"] });
        return;
      }
      await updateOperatorStatus({ id: operator.id, status: checked ? "available" : "offline" });
    } catch {
      // Error already handled by mutation's onError
    }
  };

  return (
    <Card className={cn(!operator.isActive && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{operator.operatorName}</span>
              {operator.extension && (
                <span className="text-xs text-muted-foreground">Ramal: {operator.extension}</span>
              )}
              {!operator.isActive && (
                <Badge variant="outline" className="text-xs">Inativo</Badge>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className={cn("gap-1", config.color)}>
                {config.icon}
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Intervalo: {operator.personalIntervalSeconds
                  ? `${operator.personalIntervalSeconds}s (personalizado)`
                  : "padrão"}
              </span>
            </div>

            {operator.status === "cooldown" && operator.lastCallEndedAt && (
              <CooldownTimer
                key={operator.lastCallEndedAt}
                lastCallEndedAt={operator.lastCallEndedAt}
                intervalSeconds={operator.personalIntervalSeconds ?? 30}
              />
            )}
            {operator.status === "offline" && operator.lastCallEndedAt && (
              <p className="text-xs text-muted-foreground">Último acesso: {getTimeSince(operator.lastCallEndedAt)}</p>
            )}

            <p className="text-xs text-muted-foreground">
              📊 {operator.totalCalls} ligações • {operator.totalCallsAnswered} atendidas
              {answerRate && ` (${answerRate}%)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{isOnline ? "Online" : "Offline"}</span>
                    <Switch
                      checked={isOnline}
                      onCheckedChange={handleToggle}
                      disabled={isToggleDisabled}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isToggleDisabled
                    ? "Operador inativo"
                    : operator.status === "on_call"
                      ? "Forçar offline (em ligação)"
                      : operator.status === "cooldown"
                        ? "Forçar status (em cooldown)"
                        : isOnline ? "Clique para ficar offline" : "Clique para ficar online"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" onClick={() => onConfigure(operator)} title="Configurar">
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => onRemove(operator.id)}
              title="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CooldownTimer({ lastCallEndedAt, intervalSeconds }: { lastCallEndedAt: string; intervalSeconds: number }) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - new Date(lastCallEndedAt).getTime()) / 1000;
    return Math.max(0, Math.ceil(intervalSeconds - elapsed));
  });

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - new Date(lastCallEndedAt).getTime()) / 1000;
      const r = Math.max(0, Math.ceil(intervalSeconds - elapsed));
      setRemaining(r);
      if (r <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [lastCallEndedAt, intervalSeconds]);

  const progress = Math.min(100, ((intervalSeconds - remaining) / intervalSeconds) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Timer className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
          {remaining > 0 ? `${remaining}s restantes` : "Liberando..."}
        </span>
      </div>
      <Progress value={progress} className="h-1.5 bg-amber-100 dark:bg-amber-950 [&>div]:bg-amber-500" />
    </div>
  );
}