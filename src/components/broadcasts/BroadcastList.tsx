import { useState, useMemo } from "react";
import { BroadcastCampaign } from "@/types/broadcast.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Radio,
  Search,
  Plus,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Trash2,
  Eye,
  GitBranch,
  ShieldCheck,
  Calendar,
  Send,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BroadcastListProps {
  campaigns: BroadcastCampaign[];
  isLoading: boolean;
  onSelect: (campaign: BroadcastCampaign) => void;
  onCreateNew: () => void;
  onDispatchBatch: (broadcastId: string) => Promise<any>;
  onPause: (broadcastId: string) => Promise<any>;
  onResume: (broadcastId: string) => Promise<any>;
  onDelete: (broadcastId: string) => Promise<any>;
  isDispatching?: boolean;
}

export function BroadcastList({
  campaigns,
  isLoading,
  onSelect,
  onCreateNew,
  onDispatchBatch,
  onPause,
  onResume,
  onDelete,
  isDispatching,
}: BroadcastListProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.workflow?.name?.toLowerCase().includes(search.toLowerCase());

      const matchTab =
        activeTab === "all" ||
        (activeTab === "running" && c.status === "running") ||
        (activeTab === "scheduled" && c.status === "scheduled") ||
        (activeTab === "paused" && c.status === "paused") ||
        (activeTab === "completed" && c.status === "completed");

      return matchSearch && matchTab;
    });
  }, [campaigns, search, activeTab]);

  const handleAction = async (id: string, actionFn: (id: string) => Promise<any>) => {
    try {
      setActionLoadingId(id);
      await actionFn(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30 gap-1 text-[11px] animate-pulse">
            <Play className="w-3 h-3 fill-current" /> Em Execução
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-[11px]">
            <Clock className="w-3 h-3" /> Agendado
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3" /> Concluído
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground gap-1 text-[11px]">
            <Pause className="w-3 h-3" /> Pausado
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <AlertCircle className="w-3 h-3" /> Cancelado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Search, Tabs, New Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Todas", count: campaigns.length },
            { id: "running", label: "Em Execução", count: campaigns.filter((c) => c.status === "running").length },
            { id: "scheduled", label: "Agendadas", count: campaigns.filter((c) => c.status === "scheduled").length },
            { id: "paused", label: "Pausadas", count: campaigns.filter((c) => c.status === "paused").length },
            { id: "completed", label: "Concluídas", count: campaigns.filter((c) => c.status === "completed").length },
          ].map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              onClick={() => setActiveTab(tab.id)}
              className="text-xs h-8 gap-1.5 shrink-0"
            >
              {tab.label}
              <span className="text-[10px] bg-background/80 px-1.5 py-0.2 rounded-full border border-border/50">
                {tab.count}
              </span>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar disparo por nome ou fluxo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Button
            size="sm"
            onClick={onCreateNew}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-8 text-xs shrink-0 font-semibold"
          >
            <Plus className="w-4 h-4" /> Novo Disparo
          </Button>
        </div>
      </div>

      {/* Campaigns Cards List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
          Carregando campanhas de disparo...
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="border-dashed border-border/70 p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">Nenhuma campanha de disparo encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Crie sua primeira campanha para disparar fluxos em massa para seus leads com proteção anti-ban.
          </p>
          <Button size="sm" onClick={onCreateNew} className="gap-1.5 text-xs">
            <Plus className="w-4 h-4" /> Criar Primeiro Disparo
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredCampaigns.map((camp) => {
            const total = camp.total_leads || 0;
            const sent = camp.sent_count || 0;
            const failed = camp.failed_count || 0;
            const pending = Math.max(0, total - (sent + failed));
            const progress = total > 0 ? Math.round((sent / total) * 100) : 0;
            const isActionLoading = actionLoadingId === camp.id;

            return (
              <Card
                key={camp.id}
                className="border-border/60 hover:border-primary/40 bg-card/70 backdrop-blur-sm transition-all shadow-sm group"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => onSelect(camp)}
                          className="font-bold text-base text-foreground hover:text-primary cursor-pointer transition-colors"
                        >
                          {camp.name}
                        </span>
                        {getStatusBadge(camp.status)}
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {camp.distribution_mode === "immediate" ? "Imediato" : `Anti-Ban: ${camp.daily_limit}/dia`}
                        </Badge>
                      </div>

                      {/* Workflow info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5 text-primary" />
                          Fluxo: <strong className="text-foreground">{camp.workflow?.name || "Fluxo Geral"}</strong>
                        </span>

                        <span>•</span>

                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          Janela: {camp.send_time_start} - {camp.send_time_end}
                          {camp.workdays_only && " (Dias Úteis)"}
                        </span>

                        {camp.estimated_completion_at && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Previsão de Término:{" "}
                              {format(new Date(camp.estimated_completion_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Middle: Progress */}
                    <div className="w-full lg:w-64 space-y-1.5 shrink-0">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-medium">Progresso:</span>
                        <span className="font-bold text-foreground">
                          {sent} / {total} leads ({progress}%)
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span className="text-emerald-500 font-medium">{sent} enviados</span>
                        {pending > 0 && <span>{pending} na fila</span>}
                        {failed > 0 && <span className="text-destructive font-medium">{failed} falhas</span>}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      {/* Batch Run Button */}
                      {pending > 0 && camp.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(camp.id, onDispatchBatch)}
                          disabled={isActionLoading || isDispatching}
                          className="text-xs h-8 gap-1.5 border-primary/40 hover:bg-primary/10 text-primary font-semibold"
                        >
                          {isActionLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          Disparar Lote
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onSelect(camp)}
                        className="text-xs h-8 gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detalhes
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem onClick={() => onSelect(camp)} className="gap-2">
                            <Eye className="w-3.5 h-3.5" /> Ver Destinatários
                          </DropdownMenuItem>

                          {camp.status === "running" && (
                            <DropdownMenuItem
                              onClick={() => handleAction(camp.id, onPause)}
                              className="gap-2"
                            >
                              <Pause className="w-3.5 h-3.5" /> Pausar Envio
                            </DropdownMenuItem>
                          )}

                          {camp.status === "paused" && (
                            <DropdownMenuItem
                              onClick={() => handleAction(camp.id, onResume)}
                              className="gap-2"
                            >
                              <Play className="w-3.5 h-3.5" /> Retomar Envio
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleAction(camp.id, onDelete)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir Disparo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
