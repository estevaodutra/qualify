import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCallQueue } from "@/hooks/useCallQueue";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Users, ListOrdered, CheckCircle, XCircle, Zap } from "lucide-react";

interface QueueControlPanelProps {
  campaignId: string;
}

const statusDisplay: Record<string, { label: string; color: string; description: string }> = {
  stopped: { label: "Parada", color: "bg-muted text-muted-foreground", description: 'Clique em "Iniciar" para começar a execução da fila.' },
  running: { label: "Em execução", color: "bg-emerald-100 text-emerald-800", description: "A fila está processando ligações automaticamente." },
  paused: { label: "Pausada", color: "bg-orange-100 text-orange-800", description: "Fila pausada manualmente." },
  waiting_operator: { label: "Aguardando operador", color: "bg-amber-100 text-amber-800", description: "Todos os operadores estão ocupados ou offline. Aguardando..." },
  waiting_cooldown: { label: "Aguardando intervalo", color: "bg-blue-100 text-blue-800", description: "Aguardando intervalo entre ligações." },
};

export function QueueControlPanel({ campaignId }: QueueControlPanelProps) {
  const navigate = useNavigate();
  const {
    state,
    isLoading,
    isRunning,
    availableOperators,
    onCallOperators,
    cooldownOperators,
    startQueue,
    pauseQueue,
    resumeQueue,
    stopQueue,
    isStarting,
    isPausing,
    isStopping,
    totalWaiting,
  } = useCallQueue({ campaignId, campaignFilter: campaignId });

  const currentStatus = state?.status || "stopped";
  const display = statusDisplay[currentStatus] || statusDisplay.stopped;

  const totalOperatorsActive = availableOperators.length + onCallOperators.length + cooldownOperators.length;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">EXECUÇÃO EM FILA</h3>
              <p className="text-xs text-muted-foreground">{display.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={display.color}>
              {display.label}
            </Badge>

            {currentStatus === "stopped" && (
              <Button size="sm" onClick={async () => { await startQueue(campaignId); navigate("/painel-ligacoes?tab=queue"); }} disabled={isStarting}>
                <Play className="h-3.5 w-3.5 mr-1" />
                {isStarting ? "Iniciando..." : "Iniciar"}
              </Button>
            )}
            {currentStatus === "running" && (
              <>
                <Button variant="outline" size="sm" onClick={() => pauseQueue(campaignId)} disabled={isPausing}>
                  <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
                </Button>
                <Button variant="outline" size="sm" onClick={() => stopQueue(campaignId)} disabled={isStopping}>
                  <Square className="h-3.5 w-3.5 mr-1" /> Parar
                </Button>
              </>
            )}
            {currentStatus === "paused" && (
              <>
                <Button size="sm" onClick={() => resumeQueue(campaignId)}>
                  <Play className="h-3.5 w-3.5 mr-1" /> Retomar
                </Button>
                <Button variant="outline" size="sm" onClick={() => stopQueue(campaignId)} disabled={isStopping}>
                  <Square className="h-3.5 w-3.5 mr-1" /> Parar
                </Button>
              </>
            )}
            {(currentStatus === "waiting_operator" || currentStatus === "waiting_cooldown") && (
              <Button variant="outline" size="sm" onClick={() => stopQueue(campaignId)} disabled={isStopping}>
                <Square className="h-3.5 w-3.5 mr-1" /> Parar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniMetric
            icon={<ListOrdered className="h-4 w-4 text-muted-foreground" />}
            label="Na Fila"
            value={totalWaiting}
          />
          <MiniMetric
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            label="Operadores"
            value={`${availableOperators.length} / ${totalOperatorsActive}`}
            sublabel="disponíveis"
          />
          <MiniMetric
            icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
            label="Atendidas"
            value={state?.callsAnswered ?? 0}
            sublabel={state?.callsMade ? `(${((state.callsAnswered / state.callsMade) * 100).toFixed(1)}%)` : ""}
          />
          <MiniMetric
            icon={<XCircle className="h-4 w-4 text-destructive" />}
            label="Não Atend."
            value={state?.callsNoAnswer ?? 0}
            sublabel={state?.callsMade ? `(${((state.callsNoAnswer / state.callsMade) * 100).toFixed(1)}%)` : ""}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: number | string; sublabel?: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-background border">
      {icon}
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label} {sublabel}</p>
      </div>
    </div>
  );
}
