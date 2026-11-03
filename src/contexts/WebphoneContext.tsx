import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { loadLibwebphone } from "@/lib/webphone/loadLibwebphone";
import { LibwebphoneInstance, LibwebphoneCall } from "@/types/libwebphone";
import { useToast } from "@/hooks/use-toast";

export type WebphoneStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "dialing"
  | "ringing"
  | "in_call"
  | "error";

export interface ActiveCallData {
  callLogId?: string;
  externalCallId?: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  campaignId?: string;
  startedAt?: Date;
}

export interface WebphoneContextType {
  // State
  status: WebphoneStatus;
  isOnline: boolean;
  isMuted: boolean;
  duration: number;
  activeCall: ActiveCallData | null;
  errorMessage: string | null;
  operator: any | null;
  hasSipConfig: boolean;
  isPrimaryTab: boolean;

  // Actions
  toggleOnline: (state?: boolean) => Promise<void>;
  dial: (params: { phone: string; leadId?: string; leadName?: string; campaignId?: string }) => Promise<boolean>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
  sendDTMF: (tone: string) => void;
  syncOperator: (token: string) => Promise<{ success: boolean; error?: string }>;
  claimPrimaryTab: () => void;
}

const WebphoneContext = createContext<WebphoneContextType | null>(null);

export const WebphoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const { toast } = useToast();

  const [operator, setOperator] = useState<any | null>(null);
  const [status, setStatus] = useState<WebphoneStatus>("disconnected");
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [activeCall, setActiveCall] = useState<ActiveCallData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPrimaryTab, setIsPrimaryTab] = useState<boolean>(true);

  const webphoneRef = useRef<LibwebphoneInstance | null>(null);
  const currentCallRef = useRef<LibwebphoneCall | null>(null);
  const activeCallDataRef = useRef<ActiveCallData | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Carregar operador do banco
  const fetchOperator = useCallback(async () => {
    if (!user?.id || !activeCompanyId) return;

    try {
      const { data, error } = await supabase
        .from("call_operators")
        .select("*")
        .eq("user_id", user.id)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (!error && data) {
        setOperator(data);
      }
    } catch (err) {
      console.error("[WebphoneContext] Erro ao buscar operador:", err);
    }
  }, [user?.id, activeCompanyId]);

  useEffect(() => {
    fetchOperator();
  }, [fetchOperator]);

  const hasSipConfig = Boolean(
    operator?.api4com_token && operator?.extension && operator?.sip_domain && operator?.sip_password
  );

  // 2. Proteção Multi-Abas via BroadcastChannel
  useEffect(() => {
    if (!operator?.extension) return;

    const channelName = `qualify_webphone_${operator.extension}`;
    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data?.type === "CLAIM_PRIMARY_TAB") {
        // Outra aba assumiu o controle do ramal
        if (webphoneRef.current) {
          try {
            webphoneRef.current.getUserAgent()?.unregister();
          } catch {}
        }
        setIsPrimaryTab(false);
        setIsOnline(false);
        setStatus("disconnected");
      }
    };

    return () => {
      channel.close();
    };
  }, [operator?.extension]);

  const claimPrimaryTab = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({ type: "CLAIM_PRIMARY_TAB" });
    }
    setIsPrimaryTab(true);
  }, []);

  // 3. Inicializar e Conectar Webphone SIP
  const connectSIP = useCallback(async () => {
    if (!hasSipConfig || !operator) {
      setErrorMessage("Ramal API4COM não configurado.");
      return;
    }

    try {
      setStatus("connecting");
      setErrorMessage(null);

      // Carregar libwebphone.js
      await loadLibwebphone();

      if (!window.libwebphone) {
        throw new Error("Biblioteca libwebphone indisponível");
      }

      // Reutilizar ou criar instância
      if (webphoneRef.current) {
        try {
          webphoneRef.current.getUserAgent()?.unregister();
        } catch {}
      }

      const instanceId = `instance_${operator.id.slice(0, 8)}_${Date.now()}`;

      const wp = new window.libwebphone({
        dialpad: { renderTargets: [] },
        audioContext: { renderTargets: [] },
        mediaDevices: {
          videoinput: { enabled: false },
          renderTargets: [],
        },
        userAgent: {
          renderTargets: [],
          transport: {
            sockets: [`wss://${operator.sip_domain}:6443`],
            recovery_max_interval: 30,
            recovery_min_interval: 2,
          },
          authentication: {
            username: String(operator.extension),
            password: String(operator.sip_password),
            realm: String(operator.sip_domain),
          },
          user_agent: {
            instance_id: instanceId,
            register: true,
            register_expires: 600,
            no_answer_timeout: 30,
            user_agent: "qualify-crm-webphone",
          },
        },
      });

      // Eventos SIP
      wp.on("registered", () => {
        console.log("[Webphone] SIP Registrado com sucesso!");
        setStatus("connected");
        setIsOnline(true);
        setErrorMessage(null);
      });

      wp.on("unregistered", () => {
        console.log("[Webphone] SIP Desregistrado");
        setStatus("disconnected");
        setIsOnline(false);
      });

      wp.on("registrationFailed", (data: any) => {
        console.error("[Webphone] Falha no registro SIP:", data);
        setStatus("error");
        setIsOnline(false);
        setErrorMessage("Falha de autenticação SIP. Verifique a senha do ramal.");
      });

      // AUTO-ATENDIMENTO DA API4COM
      wp.on("call.created", (lwp: any, call: LibwebphoneCall) => {
        console.log("[Webphone] call.created recebida");

        if (!call.isPrimary()) {
          console.warn("[Webphone] Chamada secundária rejeitada.");
          return call.reject();
        }

        currentCallRef.current = call;

        const customHeaders = call.getCustomHeaders?.() || {};
        const isApi4Call = customHeaders["X-Api4comintegratedcall"] === "true";

        if (isApi4Call) {
          console.log("[Webphone] Header X-Api4comintegratedcall detectado! Auto-atendendo...");
          call.answer();
          setStatus("ringing"); // Ramal atendeu, agora aguardando o lead
        }

        // Listener de status da chamada
        call.on?.("call.answered", () => {
          console.log("[Webphone] Chamada em andamento (conversação)");
          setStatus("in_call");
          setDuration(0);

          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setDuration((prev) => prev + 1);
          }, 1000);
        });

        call.on?.("call.ended", () => {
          console.log("[Webphone] Chamada encerrada pelo SIP");
          cleanupCall();
        });
      });

      wp.on("call.destroyed", () => {
        cleanupCall();
      });

      webphoneRef.current = wp;
      claimPrimaryTab();
    } catch (err: any) {
      console.error("[Webphone] Erro ao conectar SIP:", err);
      setStatus("error");
      setIsOnline(false);
      setErrorMessage(err.message || "Erro ao conectar ao servidor SIP.");
    }
  }, [hasSipConfig, operator, claimPrimaryTab]);

  const cleanupCall = useCallback(() => {
    currentCallRef.current = null;
    activeCallDataRef.current = null;
    setActiveCall(null);
    setIsMuted(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus("connected");
  }, []);

  const disconnectSIP = useCallback(() => {
    if (webphoneRef.current) {
      try {
        webphoneRef.current.getUserAgent()?.unregister();
      } catch {}
      webphoneRef.current = null;
    }
    cleanupCall();
    setIsOnline(false);
    setStatus("disconnected");
  }, [cleanupCall]);

  const toggleOnline = useCallback(
    async (forceState?: boolean) => {
      const nextState = forceState !== undefined ? forceState : !isOnline;
      if (nextState) {
        // Pedir permissão de microfone se necessário
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          toast({
            title: "Microfone bloqueado",
            description: "Permita o acesso ao microfone nas permissões do navegador.",
            variant: "destructive",
          });
          return;
        }
        await connectSIP();
      } else {
        disconnectSIP();
      }
    },
    [isOnline, connectSIP, disconnectSIP, toast]
  );

  // 4. Iniciar Discagem (Click-to-Call)
  const dial = useCallback(
    async ({
      phone,
      leadId,
      leadName,
      campaignId,
    }: {
      phone: string;
      leadId?: string;
      leadName?: string;
      campaignId?: string;
    }): Promise<boolean> => {
      if (!isOnline || status === "disconnected" || status === "error") {
        toast({
          title: "Webphone offline",
          description: "Fique online no Webphone antes de realizar a ligação.",
          variant: "destructive",
        });
        return false;
      }

      if (!operator?.id) {
        toast({
          title: "Erro de Operador",
          description: "Operador não carregado.",
          variant: "destructive",
        });
        return false;
      }

      setStatus("dialing");
      const callData: ActiveCallData = {
        leadId,
        leadName: leadName || phone,
        leadPhone: phone,
        campaignId,
        startedAt: new Date(),
      };
      setActiveCall(callData);
      activeCallDataRef.current = callData;

      try {
        const { data, error } = await supabase.functions.invoke("api4com-call-dial", {
          body: {
            operator_id: operator.id,
            phone,
            lead_id: leadId,
            campaign_id: campaignId,
          },
        });

        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "Falha ao discar");
        }

        setActiveCall((prev) => ({
          ...prev,
          callLogId: data.callLogId,
          externalCallId: data.externalCallId,
        }));

        setStatus("ringing");
        return true;
      } catch (err: any) {
        console.error("[Webphone] Erro ao discar:", err);
        toast({
          title: "Falha na chamada",
          description: err.message,
          variant: "destructive",
        });
        cleanupCall();
        return false;
      }
    },
    [isOnline, status, operator?.id, cleanupCall, toast]
  );

  // 5. Desligar Chamada
  const hangup = useCallback(async () => {
    if (currentCallRef.current) {
      try {
        currentCallRef.current.hangup();
      } catch {}
    }

    const cur = activeCallDataRef.current;
    if (cur?.externalCallId && operator?.id) {
      try {
        await supabase.functions.invoke("api4com-call-hangup", {
          body: {
            operator_id: operator.id,
            external_call_id: cur.externalCallId,
            call_log_id: cur.callLogId,
          },
        });
      } catch (e) {
        console.warn("Erro ao notificar hangup no backend:", e);
      }
    }

    cleanupCall();
  }, [operator?.id, cleanupCall]);

  // 6. Mute / Unmute
  const toggleMute = useCallback(() => {
    if (!currentCallRef.current) return;
    try {
      if (isMuted) {
        currentCallRef.current.unmute();
        setIsMuted(false);
      } else {
        currentCallRef.current.mute();
        setIsMuted(true);
      }
    } catch (e) {
      console.warn("Erro ao alternar mudo:", e);
    }
  }, [isMuted]);

  // 7. Enviar tom DTMF
  const sendDTMF = useCallback((tone: string) => {
    if (!currentCallRef.current) return;
    try {
      currentCallRef.current.sendDTMF(tone);
    } catch (e) {
      console.warn("Erro ao enviar DTMF:", e);
    }
  }, []);

  // 8. Sincronizar Operador com a API4COM
  const syncOperator = useCallback(
    async (token: string): Promise<{ success: boolean; error?: string }> => {
      if (!operator?.id) {
        return { success: false, error: "Nenhum operador vinculado." };
      }

      try {
        const { data, error } = await supabase.functions.invoke("api4com-sync-operator", {
          body: {
            operator_id: operator.id,
            api4com_token: token,
          },
        });

        if (error || !data?.success) {
          return { success: false, error: data?.error || error?.message };
        }

        await fetchOperator();
        toast({
          title: "Ramal Sincronizado",
          description: `Ramal ${data.sip?.extension} vinculado e webhook configurado com sucesso!`,
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [operator?.id, fetchOperator, toast]
  );

  return (
    <WebphoneContext.Provider
      value={{
        status,
        isOnline,
        isMuted,
        duration,
        activeCall,
        errorMessage,
        operator,
        hasSipConfig,
        isPrimaryTab,
        toggleOnline,
        dial,
        hangup,
        toggleMute,
        sendDTMF,
        syncOperator,
        claimPrimaryTab,
      }}
    >
      {children}
    </WebphoneContext.Provider>
  );
};

export const useWebphone = () => {
  const context = useContext(WebphoneContext);
  if (!context) {
    throw new Error("useWebphone deve ser utilizado dentro de um WebphoneProvider");
  }
  return context;
};
