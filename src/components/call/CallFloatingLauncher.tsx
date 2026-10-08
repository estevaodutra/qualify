import { useEffect, useRef } from "react";
import { useCallFloatingStore, CallDialogData } from "@/stores/callFloating.store";
import { useChatExpressStore } from "@/stores/chatExpress.store";
import { useOperatorCall, PopupCallStatus } from "@/hooks/useOperatorCall";
import { CallActionDialog } from "@/components/operator/CallActionDialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneCall, PhoneOff, Loader2, Timer, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

export function CallFloatingLauncher() {
  const {
    isOpen,
    isMinimized,
    activeCall,
    callStatus,
    duration,
    openCall,
    closeCallDialog,
    setActiveCall,
    setCallStatus,
    setDuration,
  } = useCallFloatingStore();

  const isChatMinimized = useChatExpressStore((s) => s.isOpen && s.isMinimized);

  const {
    operator,
    currentCall,
    callStatus: opStatus,
    callDuration: opDuration,
    isLoading: opLoading,
  } = useOperatorCall();

  const prevCallIdRef = useRef<string | null>(null);
  const userClosedCallIdRef = useRef<string | null>(null);

  // Sync operator call data to global floating store
  useEffect(() => {
    if (currentCall) {
      const mappedData: CallDialogData = {
        callId: currentCall.id,
        campaignId: currentCall.campaignId || "",
        leadId: currentCall.leadId || "",
        leadName: currentCall.leadName || "Lead",
        leadPhone: currentCall.leadPhone || "",
        campaignName: currentCall.campaignName || "Geral",
        duration: opDuration || duration,
        notes: currentCall.notes || currentCall.observations || "",
        attemptNumber: currentCall.attemptNumber || 1,
        maxAttempts: currentCall.maxAttempts || 3,
        isPriority: currentCall.isPriority || false,
        callStatus: currentCall.callStatus || opStatus,
        externalCallId: currentCall.externalCallId,
        audioUrl: currentCall.audioUrl,
        operatorId: operator?.id,
      };

      setActiveCall(mappedData);
      setCallStatus(opStatus as any);
      setDuration(opDuration);

      // Auto-open modal when a NEW call is initiated/assigned
      const isNewCall = currentCall.id !== prevCallIdRef.current;
      const isCallingState = ["dialing", "ringing", "on_call"].includes(opStatus);

      if (isNewCall && isCallingState) {
        prevCallIdRef.current = currentCall.id;
        userClosedCallIdRef.current = null;
        openCall(mappedData);
      }
    } else {
      if (opStatus !== "idle") {
        setCallStatus(opStatus as any);
      } else if (!activeCall?.callId) {
        setCallStatus("idle");
      }
    }
  }, [currentCall, opStatus, opDuration, operator?.id, setActiveCall, setCallStatus, setDuration, openCall, duration, activeCall?.callId]);

  // Handle click on floating launcher
  const handleLauncherClick = () => {
    if (activeCall && activeCall.callId) {
      openCall(activeCall);
    } else if (currentCall) {
      const fallbackData: CallDialogData = {
        callId: currentCall.id,
        campaignId: currentCall.campaignId || "",
        leadId: currentCall.leadId || "",
        leadName: currentCall.leadName || "Lead",
        leadPhone: currentCall.leadPhone || "",
        campaignName: currentCall.campaignName || "Geral",
        duration: opDuration,
        notes: currentCall.notes || "",
        attemptNumber: currentCall.attemptNumber || 1,
        maxAttempts: currentCall.maxAttempts || 3,
        isPriority: currentCall.isPriority || false,
        callStatus: currentCall.callStatus,
        externalCallId: currentCall.externalCallId,
        audioUrl: currentCall.audioUrl,
        operatorId: operator?.id,
      };
      openCall(fallbackData);
    } else {
      // Open empty/manual call dialog
      openCall({
        callId: "",
        campaignId: "",
        leadId: "",
        leadName: "Nova Ligação",
        leadPhone: "",
        campaignName: "Discador",
        duration: 0,
        notes: "",
        attemptNumber: 1,
        maxAttempts: 3,
        isPriority: false,
        callStatus: "idle",
      });
    }
  };

  const effectiveStatus = (activeCall?.callStatus as PopupCallStatus) || callStatus || "idle";
  const isOnCall = ["on_call", "in_call", "answered", "in_progress"].includes(effectiveStatus);
  const isDialing = effectiveStatus === "dialing";
  const isRinging = effectiveStatus === "ringing";
  const isEnded = ["ended", "completed"].includes(effectiveStatus);
  const isFailed = ["failed", "no_answer"].includes(effectiveStatus);

  return (
    <>
      {/* Floating launcher bubble */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          // Position relative to screen & coexistence with chat dock
          isChatMinimized
            ? "bottom-[84px] md:bottom-[88px] right-4 md:right-6"
            : "bottom-4 md:bottom-6 right-4 md:right-6"
        )}
      >
        <button
          type="button"
          onClick={handleLauncherClick}
          title="Abrir painel de chamadas"
          className={cn(
            "group relative h-13 md:h-14 px-4 md:px-5 rounded-full flex items-center gap-3 transition-all duration-300 select-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_12px_36px_rgba(59,77,255,0.22)] active:scale-95",
            "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border",
            isOnCall && "border-emerald-500/50 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20",
            (isDialing || isRinging) && "border-blue-500/50 ring-2 ring-blue-500/20 animate-pulse",
            isFailed && "border-destructive/40 bg-destructive/5",
            !isOnCall && !isDialing && !isRinging && !isFailed && "border-slate-200/80 dark:border-slate-800 hover:border-primary/50"
          )}
        >
          {/* Status Indicator Icon */}
          <div className="relative flex items-center justify-center">
            {isOnCall ? (
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                </div>
              </div>
            ) : isDialing ? (
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : isRinging ? (
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Phone className="w-4 h-4 animate-pulse" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#3B4DFF] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Phone className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Text & Information */}
          <div className="flex flex-col text-left">
            {isOnCall ? (
              <>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Em Ligação
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-none">
                    {formatDuration(duration || opDuration)}
                  </span>
                  {activeCall?.leadName && (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[110px] md:max-w-[140px]">
                      • {activeCall.leadName}
                    </span>
                  )}
                </div>
              </>
            ) : isDialing ? (
              <>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Discando...
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">
                  {activeCall?.leadName || "Conectando"}
                </span>
              </>
            ) : isRinging ? (
              <>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Chamando...
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">
                  {activeCall?.leadName || "Aguardando"}
                </span>
              </>
            ) : isEnded ? (
              <>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Finalizada
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Ligações
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                    Ligações
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title="Pronto para atender" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {operator ? operator.operatorName : "Disponível"}
                </span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Global Call Action Dialog */}
      {isOpen && activeCall && (
        <CallActionDialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeCallDialog();
            }
          }}
          callId={activeCall.callId}
          campaignId={activeCall.campaignId}
          leadId={activeCall.leadId}
          leadName={activeCall.leadName}
          leadPhone={activeCall.leadPhone}
          campaignName={activeCall.campaignName}
          duration={duration || opDuration}
          attemptNumber={activeCall.attemptNumber}
          maxAttempts={activeCall.maxAttempts}
          isPriority={activeCall.isPriority}
          callStatus={effectiveStatus}
          externalCallId={activeCall.externalCallId}
          initialObservations={activeCall.notes}
          audioUrl={activeCall.audioUrl}
          operatorId={activeCall.operatorId || operator?.id}
          userId={activeCall.userId}
        />
      )}
    </>
  );
}
