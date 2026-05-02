import { useState } from "react";
import { Phone, PhoneOff, Minus, Maximize2, Loader2, AlertTriangle, PhoneMissed, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useOperatorCall, PopupCallStatus } from "@/hooks/useOperatorCall";
import { CooldownOverlay } from "./CooldownOverlay";
import { CallActionDialog } from "./CallActionDialog";
import { cn } from "@/lib/utils";

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

const statusConfig: Record<PopupCallStatus, { icon: React.ReactNode; label: string; color: string; pulse?: boolean }> = {
  idle: { icon: <Phone className="h-4 w-4" />, label: "Disponível", color: "text-emerald-500" },
  dialing: { icon: <Loader2 className="h-4 w-4 animate-spin" />, label: "DISCANDO...", color: "text-blue-500", pulse: true },
  ringing: { icon: <Phone className="h-4 w-4" />, label: "CHAMANDO...", color: "text-amber-500", pulse: true },
  on_call: { icon: <Phone className="h-4 w-4" />, label: "EM LIGAÇÃO", color: "text-emerald-500" },
  ended: { icon: <Phone className="h-4 w-4" />, label: "FINALIZADA", color: "text-muted-foreground" },
  no_answer: { icon: <PhoneMissed className="h-4 w-4" />, label: "NÃO ATENDEU", color: "text-amber-500" },
  failed: { icon: <AlertTriangle className="h-4 w-4" />, label: "FALHA", color: "text-destructive" },
};

interface CallPopupProps {
  embedded?: boolean;
}

export function CallPopup({ embedded = false }: CallPopupProps) {
  const {
    operator, currentCall, callStatus, callDuration,
    cooldownRemaining, isLoading, cooldownTotal, toggleAvailability,
    dialingTooLong, cancelDialing,
  } = useOperatorCall();

  const [minimized, setMinimized] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyExternalId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Don't render if user is not an operator
  if (isLoading || !operator) return null;

  const config = statusConfig[callStatus];
  const isActive = ["dialing", "ringing", "on_call"].includes(callStatus);
  const showCooldown = callStatus === "ended" && cooldownRemaining > 0;
  const isOnline = operator.status === "available" || operator.status === "on_call" || operator.status === "cooldown";
  const isOffline = operator.status === "offline";

  // Minimized bar or idle/offline
  if (minimized || callStatus === "idle" || isOffline) {
    return (
      <div
        className={cn(
          "rounded-lg border shadow-lg px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-all bg-card",
          !embedded && "fixed bottom-6 right-6 z-50",
          embedded && "w-full shadow-sm",
          isOffline && "border-muted opacity-80",
          callStatus === "idle" && !isOffline && "border-emerald-500/30",
          isActive && "border-primary animate-pulse"
        )}
        onClick={() => { if (callStatus !== "idle" && !isOffline) setMinimized(false); }}
      >
        <Switch
          checked={isOnline}
          onCheckedChange={() => toggleAvailability()}
          className="data-[state=checked]:bg-emerald-500"
          onClick={(e) => e.stopPropagation()}
        />
        {isOffline ? (
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <PhoneOff className="h-4 w-4" />
            Offline
          </span>
        ) : (
          <>
            <span className={cn("flex items-center gap-2 text-sm font-medium", config.color)}>
              {config.icon}
              {config.label}
            </span>
            {callStatus === "on_call" && (
              <span className="text-xs font-mono text-muted-foreground">{formatDuration(callDuration)}</span>
            )}
            {callStatus === "idle" && (
              <span className="text-xs text-muted-foreground">Aguardando...</span>
            )}
            {isActive && callStatus !== "idle" && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setMinimized(false); }}>
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  // Expanded card
  return (
    <>
      <div className={cn(
        "rounded-xl border bg-card overflow-hidden",
        !embedded && "fixed bottom-6 right-6 z-50 w-[380px] shadow-2xl",
        embedded && "w-full shadow-sm"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-4 py-3 border-b",
          callStatus === "on_call" && "bg-emerald-500/5",
          callStatus === "dialing" && "bg-blue-500/5",
          callStatus === "ringing" && "bg-amber-500/5",
          callStatus === "failed" && "bg-destructive/5",
        )}>
          <div className="flex items-center gap-2">
            <span className={cn(config.color, config.pulse && "animate-pulse")}>{config.icon}</span>
            <span className={cn("font-semibold text-sm", config.color)}>{config.label}</span>
          </div>
          <div className="flex items-center gap-1">
            {callStatus === "on_call" && (
              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">⏱️ {formatDuration(callDuration)}</span>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(true)}>
              <Minus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Lead info */}
          {currentCall && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {currentCall.leadName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{currentCall.leadName}</p>
                    <p className="text-xs text-muted-foreground">{currentCall.leadPhone}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCallDialog(true)}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="outline" className="text-xs">📁 {currentCall.campaignName}</Badge>
                <Badge variant="outline" className="text-xs">🔄 x{currentCall.attemptNumber}</Badge>
                {currentCall.isPriority && <Badge variant="secondary" className="text-xs">⭐ Prioridade</Badge>}
              </div>
              {/* Raw status + External ID */}
              <div className="space-y-1 pt-1.5 border-t border-border/50 mt-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status DB:</span>
                  <Badge variant="outline" className="text-xs font-mono">{currentCall.callStatus}</Badge>
                </div>
                {currentCall.externalCallId && (
                  <div className="flex items-center justify-between text-xs gap-1">
                    <span className="text-muted-foreground shrink-0">ID Externo:</span>
                    <button
                      onClick={() => copyExternalId(currentCall.externalCallId!)}
                      className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground truncate max-w-[200px] transition-colors"
                      title={currentCall.externalCallId}
                    >
                      <span className="truncate">{currentCall.externalCallId}</span>
                      {copied ? <Check className="h-3 w-3 text-emerald-500 shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Dialing state */}
          {callStatus === "dialing" && !dialingTooLong && (
            <div className="text-center space-y-2 py-2">
              <div className="flex justify-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-xs text-muted-foreground">⏳ Conectando com o número...</p>
            </div>
          )}

          {/* Dialing timeout warning */}
          {callStatus === "dialing" && dialingTooLong && (
            <div className="space-y-2 py-2">
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2.5 text-center space-y-1.5">
                <p className="text-xs font-medium text-amber-600 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Sem resposta do provedor
                </p>
                <p className="text-xs text-muted-foreground">A ligação pode não ter sido iniciada.</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => cancelDialing()}
              >
                <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
                Cancelar chamada
              </Button>
            </div>
          )}

          {/* Ringing state */}
          {callStatus === "ringing" && (
            <div className="text-center space-y-2 py-2">
              <div className="text-2xl animate-pulse">🔔</div>
              <p className="text-xs text-muted-foreground">📱 Aguardando atendimento...</p>
            </div>
          )}

          {/* On call - observations + custom fields + actions */}
          {callStatus === "on_call" && currentCall && (
            <>
              {currentCall.observations && (
                <div className="rounded border bg-amber-500/10 border-amber-500/20 p-2">
                  <p className="text-xs font-medium text-amber-600">📝 Observação</p>
                  <p className="text-sm">{currentCall.observations}</p>
                </div>
              )}
              {Object.keys(currentCall.leadCustomFields).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">📝 Informações</p>
                  <div className="rounded border bg-muted/10 p-2 space-y-0.5">
                    {Object.entries(currentCall.leadCustomFields).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* No answer */}
          {callStatus === "no_answer" && currentCall && (
            <div className="text-center space-y-1 py-1">
              <p className="text-sm">🔄 Tentativa {currentCall.attemptNumber} de {currentCall.maxAttempts}</p>
              {currentCall.scheduledFor && (
                <p className="text-xs text-muted-foreground">
                  ⏰ Reagendado para: {new Date(currentCall.scheduledFor).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          )}

          {/* Failed */}
          {callStatus === "failed" && (
            <div className="text-center py-1">
              <p className="text-sm text-destructive">⚠️ Erro na ligação</p>
            </div>
          )}

          {/* Cooldown */}
          {showCooldown && operator && (
            <CooldownOverlay
              remaining={cooldownRemaining}
              total={cooldownTotal}
              operatorId={operator.id}
            />
          )}

          {/* Ended without cooldown - show briefly */}
          {callStatus === "ended" && !showCooldown && currentCall && (
            <p className="text-center text-xs text-muted-foreground">✅ Ligação encerrada</p>
          )}
        </div>
      </div>

      {/* Unified Call Dialog */}
      {currentCall?.campaignId && currentCall.leadId && (
        <CallActionDialog
          open={showCallDialog}
          onOpenChange={setShowCallDialog}
          callId={currentCall.id}
          campaignId={currentCall.campaignId}
          leadId={currentCall.leadId}
          leadName={currentCall.leadName}
          leadPhone={currentCall.leadPhone}
          campaignName={currentCall.campaignName}
          duration={callDuration}
          initialObservations={currentCall.observations || undefined}
          attemptNumber={currentCall.attemptNumber}
          maxAttempts={currentCall.maxAttempts}
          isPriority={currentCall.isPriority}
          callStatus={currentCall.callStatus}
          externalCallId={currentCall.externalCallId}
          operatorId={operator?.id}
          audioUrl={currentCall.audioUrl}
        />
      )}

    </>
  );
}
