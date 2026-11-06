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
  connectSIP: () => Promise<boolean>;
  disconnectSIP: () => void;
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
        // Sincroniza com o perfil do usuário para garantir as credenciais mais recentes
        const { data: prof } = await supabase
          .from("profiles")
          .select("api4com_token, api4com_extension, api4com_domain, api4com_password")
          .eq("id", user.id)
          .maybeSingle();

        if (prof) {
          if (prof.api4com_token) data.api4com_token = prof.api4com_token;
          if (prof.api4com_extension) data.extension = prof.api4com_extension;
          if (prof.api4com_domain) data.sip_domain = prof.api4com_domain;
          if (prof.api4com_password) data.sip_password = prof.api4com_password;
        }

        // Se tem token mas a senha SIP estiver ausente, recupera diretamente da API4COM
        if (data.api4com_token && (!data.sip_password || !data.extension)) {
          try {
            const sippulseRes = await fetch(
              "https://api.api4com.com/api/v1/integrations?filter[where][gateway]=sippulse",
              { headers: { Authorization: data.api4com_token } }
            );
            if (sippulseRes.ok) {
              const list = await sippulseRes.json();
              if (Array.isArray(list) && list.length > 0 && list[0]?.metadata) {
                const meta = list[0].metadata;
                data.extension = String(meta.username || data.extension || "");
                data.sip_domain = String(meta.domain || data.sip_domain || "d2x.api4com.com");
                data.sip_password = String(meta.password || "");

                // Salva no perfil e no operador em background
                supabase
                  .from("profiles")
                  .update({
                    api4com_extension: data.extension,
                    api4com_domain: data.sip_domain,
                    api4com_password: data.sip_password,
                  })
                  .eq("id", user.id)
                  .catch(console.warn);

                supabase
                  .from("call_operators")
                  .update({
                    extension: data.extension,
                    sip_domain: data.sip_domain,
                    sip_password: data.sip_password,
                  })
                  .eq("id", data.id)
                  .catch(console.warn);
              }
            }
          } catch (sipFetchErr) {
            console.warn("[WebphoneContext] Aviso ao buscar SIP dinâmico:", sipFetchErr);
          }
        }

        setOperator(data);
      } else if (!data) {
        // Se ainda não existe call_operators, verifica se o usuário possui token no perfil
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, email, api4com_token, api4com_extension, api4com_domain, api4com_password")
          .eq("id", user.id)
          .maybeSingle();

        if (prof?.api4com_token) {
          const { data: newOp } = await supabase
            .from("call_operators")
            .insert({
              user_id: user.id,
              company_id: activeCompanyId,
              operator_name: prof.full_name || prof.email || "Operador",
              extension: prof.api4com_extension || null,
              api4com_token: prof.api4com_token,
              sip_domain: prof.api4com_domain || null,
              sip_password: prof.api4com_password || null,
              is_active: true,
              status: "offline",
            })
            .select()
            .maybeSingle();

          if (newOp) {
            setOperator(newOp);
          }
        } else {
          setOperator(null);
        }
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

  // 3. Inicializar e Conectar Webphone SIP
  const connectSIP = useCallback(async (): Promise<boolean> => {
    if (!hasSipConfig || !operator) {
      setErrorMessage("Ramal API4COM não configurado.");
      return false;
    }

    if (isOnline && webphoneRef.current?.getUserAgent()?.isRegistered?.()) {
      return true;
    }

    return new Promise<boolean>(async (resolve) => {
      let settled = false;
      let registrationTimeout: any = null;

      const settle = (ok: boolean) => {
        if (!settled) {
          settled = true;
          if (registrationTimeout) clearTimeout(registrationTimeout);
          resolve(ok);
        }
      };

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
            webphoneRef.current.getUserAgent()?.stop?.();
            webphoneRef.current.getUserAgent()?.unregister?.();
          } catch {}
        }

        // Timeout de segurança para evitar loop infinito
        registrationTimeout = setTimeout(() => {
          console.warn("[Webphone] Timeout aguardando registro SIP");
          setStatus("error");
          setIsOnline(false);
          setErrorMessage("Tempo limite esgotado ao registrar no servidor SIP. Verifique a conexão com a internet.");
          settle(false);
        }, 12000);

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

        const ua = wp.getUserAgent?.();

        const onRegistered = () => {
          console.log("[Webphone] SIP Registrado com sucesso para ramal:", operator.extension);
          setStatus("connected");
          setIsOnline(true);
          setErrorMessage(null);
          settle(true);
        };

        const onUnregistered = () => {
          console.log("[Webphone] SIP Desregistrado");
          setStatus("disconnected");
          setIsOnline(false);
        };

        const onRegistrationFailed = (data: any) => {
          console.error("[Webphone] Falha no registro SIP:", data);
          setStatus("error");
          setIsOnline(false);
          setErrorMessage("Falha de autenticação SIP. Verifique a senha do ramal.");
          settle(false);
        };

        // Registrar listeners tanto no wp quanto no userAgent
        wp.on("userAgent.registered", onRegistered);
        wp.on("registered", onRegistered);
        ua?.on?.("registered", onRegistered);

        wp.on("userAgent.unregistered", onUnregistered);
        wp.on("unregistered", onUnregistered);
        ua?.on?.("unregistered", onUnregistered);

        wp.on("userAgent.registrationFailed", onRegistrationFailed);
        wp.on("registrationFailed", onRegistrationFailed);
        ua?.on?.("registrationFailed", onRegistrationFailed);

        // INICIAR REGISTRO SIP NO WEBSOCKET
        try {
          console.log("[Webphone] Iniciando UA SIP para ramal:", operator.extension);
          ua?.start?.(
            String(operator.extension),
            String(operator.sip_password),
            String(operator.sip_domain)
          );
        } catch (startErr) {
          console.warn("[Webphone] Aviso ao chamar ua.start:", startErr);
        }

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
        settle(false);
      }
    });
  }, [hasSipConfig, operator, isOnline, claimPrimaryTab, cleanupCall]);


  const disconnectSIP = useCallback(() => {
    if (webphoneRef.current) {
      try {
        const ua = webphoneRef.current.getUserAgent?.();
        ua?.stop?.();
        ua?.unregister?.();
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

  // Auto-conectar SIP em segundo plano quando credenciais estiverem prontas
  useEffect(() => {
    if (hasSipConfig && operator?.extension && status === "disconnected" && !isOnline) {
      console.log("[Webphone] Auto-conectando SIP em segundo plano para ramal:", operator.extension);
      connectSIP();
    }
  }, [hasSipConfig, operator?.extension, status, isOnline, connectSIP]);

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
        connectSIP,
        disconnectSIP,
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
