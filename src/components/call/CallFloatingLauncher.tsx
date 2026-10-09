import { useEffect, useRef, useCallback } from "react";
import { useCallFloatingStore, CallDialogData } from "@/stores/callFloating.store";
import { useChatExpressStore } from "@/stores/chatExpress.store";
import { useOperatorCall, PopupCallStatus } from "@/hooks/useOperatorCall";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
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
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  const {
    isOpen,
    isMinimized,
    activeCall,
    callStatus,
    duration,
    openCall,
    openList,
    closeCallDialog,
    setActiveCall,
    setCallStatus,
    setDuration,
  } = useCallFloatingStore();

  const isChatDockOpen = useChatExpressStore((s) => s.isOpen && !s.isMinimized);
  const isChatMinimized = useChatExpressStore((s) => s.isOpen && s.isMinimized);

  const {
    operator,
    currentCall,
    callStatus: opStatus,
    callDuration: opDuration,
    isLoading: opLoading,
  } = useOperatorCall();

  const prevCallIdRef = useRef<string | null>(null);


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

  // End of sync operator call data

  // Handle click on floating launcher
  const handleLauncherClick = () => {
    if (isMinimized) {
      if (activeCall && activeCall.callId) {
        openCall(activeCall);
      } else {
        openList();
      }
      return;
    }

    if (isOpen) {
      useCallFloatingStore.getState().minimizeCallDialog();
      return;
    }

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
      // Open the Mini Call Panel list!
      openList();
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
          // When Chat Express Dock window is open, slide left to avoid overlap!
          isChatDockOpen
            ? "bottom-4 md:bottom-6 right-4 md:right-[505px]"
            : "bottom-4 md:bottom-6 right-4 md:right-6"
        )}
      >
        <button
          type="button"
          onClick={handleLauncherClick}
          title={
            isOnCall
              ? `Em Ligação • ${formatDuration(duration || opDuration)}`
              : isDialing
              ? "Discando..."
              : isRinging
              ? "Chamando..."
              : "Ligações (Disponível)"
          }
          className={cn(
            "group relative h-12 w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center transition-all duration-300 select-none shadow-[0_8px_30px_rgb(0,0,0,0.18)] hover:shadow-[0_12px_36px_rgba(59,77,255,0.35)] active:scale-95 hover:scale-105 border-2 border-white/20",
            isOnCall
              ? "bg-emerald-500 text-white ring-4 ring-emerald-500/25 shadow-emerald-500/30"
              : isDialing || isRinging
              ? "bg-blue-600 text-white ring-4 ring-blue-500/25 animate-pulse"
              : isFailed
              ? "bg-rose-500 text-white ring-4 ring-rose-500/25"
              : "bg-gradient-to-tr from-[#7C3AED] to-[#3B4DFF] text-white"
          )}
        >
          {isOnCall ? (
            <div className="relative flex items-center justify-center">
              <span className="absolute -inset-1 rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <PhoneCall className="w-5 h-5 md:w-6 md:h-6 animate-bounce" />
            </div>
          ) : isDialing ? (
            <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
          ) : isRinging ? (
            <Phone className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
          ) : (
            <Phone className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
          )}

          {/* Indicador verde de disponibilidade no canto superior direito */}
          {!isOnCall && !isDialing && !isRinging && !isFailed && (
            <span
              className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 shadow-xs pointer-events-none"
              title="Disponível"
            />
          )}
        </button>
      </div>

      {/* Global Call Action Dialog */}
      {isOpen && !isMinimized && (
        <CallActionDialog
          open={isOpen && !isMinimized}
          onOpenChange={(open) => {
            if (!open) {
              closeCallDialog();
            }
          }}
          callId={activeCall?.callId}
          campaignId={activeCall?.campaignId}
          leadId={activeCall?.leadId}
          leadName={activeCall?.leadName}
          leadPhone={activeCall?.leadPhone}
          campaignName={activeCall?.campaignName}
          duration={duration || opDuration}
          attemptNumber={activeCall?.attemptNumber}
          maxAttempts={activeCall?.maxAttempts}
          isPriority={activeCall?.isPriority}
          callStatus={effectiveStatus}
          externalCallId={activeCall?.externalCallId}
          initialObservations={activeCall?.notes}
          audioUrl={activeCall?.audioUrl}
          operatorId={activeCall?.operatorId || operator?.id}
          userId={activeCall?.userId}
          autoDial={activeCall?.autoDial}
        />
      )}
    </>
  );
}
