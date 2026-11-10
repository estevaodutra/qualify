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
  const connectingRef = useRef<Promise<boolean> | null>(null);
  const intentionalDisconnectRef = useRef(false);

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
          // O operador é a fonte atual; o perfil só preenche dados ainda ausentes.
          if (!data.api4com_token) data.api4com_token = prof.api4com_token;
          if (!data.extension) data.extension = prof.api4com_extension;
          if (!data.sip_domain) data.sip_domain = prof.api4com_domain;
          if (!data.sip_password) data.sip_password = prof.api4com_password;
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
    setStatus(webphoneRef.current?.getUserAgent()?.isRegistered?.() ? "connected" : "disconnected");
  }, []);

  // 3. Inicializar e Conectar Webphone SIP
  const connectSIP = useCallback(async (): Promise<boolean> => {
    if (!hasSipConfig || !operator) {
      setErrorMessage("Ramal API4COM não configurado.");
      return false;
    }

    if (webphoneRef.current?.getUserAgent()?.isRegistered?.()) {
      return true;
    }
    if (connectingRef.current) return connectingRef.current;

    const attempt = new Promise<boolean>(async (resolve) => {
      let settled = false;
      let registrationTimeout: any = null;
      let regCheckInterval: any = null;

      const settle = (ok: boolean) => {
        if (!settled) {
          settled = true;
          if (registrationTimeout) clearTimeout(registrationTimeout);
          if (regCheckInterval) clearInterval(regCheckInterval);
          resolve(ok);
        }
      };

      try {
        intentionalDisconnectRef.current = false;
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
          } catch {}
          webphoneRef.current = null;
        }

        // Timeout de segurança para evitar loop infinito
        registrationTimeout = setTimeout(() => {
          console.warn("[Webphone] Timeout aguardando registro SIP");
          try { webphoneRef.current?.getUserAgent()?.stop?.(); } catch {}
          webphoneRef.current = null;
          setStatus("error");
          setIsOnline(false);
          setErrorMessage("Tempo limite esgotado ao registrar no servidor SIP. Verifique a conexão com a internet.");
          settle(false);
        }, 20000);

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
          if (settled) return;
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
          const cause =
            data?.cause ||
            data?.response?.reason_phrase ||
            data?.response?.status_code ||
            data?.message;
          setStatus("error");
          setIsOnline(false);
          setErrorMessage(
            cause
              ? `Falha no registro SIP: ${String(cause)}.`
              : "Falha no registro SIP. Sincronize novamente o ramal nas Configurações de Telefonia."
          );
          settle(false);
        };
        const onConfigurationError = (_: unknown, __: unknown, error: Error) => {
          setStatus("error");
          setIsOnline(false);
          setErrorMessage(error?.message || "Configuração SIP inválida.");
          settle(false);
        };

        // Eventos publicados pela instância da libwebphone incluída no projeto.
        wp.on("userAgent.registration.registered", onRegistered);
        wp.on("userAgent.connected", () => {
          console.log("[Webphone] WebSocket SIP conectado:", operator.sip_domain);
        });

        wp.on("userAgent.registration.unregistered", onUnregistered);
        wp.on("userAgent.disconnected", () => {
          if (intentionalDisconnectRef.current) return;
          setIsOnline(false);
          setStatus("disconnected");
          setErrorMessage("Conexão SIP perdida. Reconecte o Webphone antes de ligar.");
        });

        wp.on("userAgent.registration.failed", onRegistrationFailed);
        wp.on("userAgent.configuration.error", onConfigurationError);

        // Polling ativo a cada 200ms para confirmar registro SIP mesmo se o evento falhar
        regCheckInterval = setInterval(() => {
          try {
            if (ua?.isRegistered?.()) {
              console.log("[Webphone] ua.isRegistered() retornou true via polling!");
              clearInterval(regCheckInterval);
              onRegistered();
            }
          } catch {}
        }, 200);

        // INICIAR REGISTRO SIP NO WEBSOCKET
        console.log("[Webphone] Iniciando UA SIP para ramal:", operator.extension);
        ua?.start?.();

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

        });

        // A libwebphone publica o ciclo da chamada no emissor principal.
        wp.on("call.established", (_lwp: unknown, call: LibwebphoneCall) => {
          if (currentCallRef.current !== call) return;
          setStatus("in_call");
          setDuration(0);
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
        });
        const onCallEnded = (_lwp: unknown, call: LibwebphoneCall) => {
          if (currentCallRef.current === call) cleanupCall();
        };
        wp.on("call.ended", onCallEnded);
        wp.on("call.failed", onCallEnded);

        webphoneRef.current = wp;
        claimPrimaryTab();
      } catch (err: any) {
        console.error("[Webphone] Erro ao conectar SIP:", err);
        setStatus("error");
        setIsOnline(false);
        setErrorMessage(
          err?.name === "NotAllowedError"
            ? "Microfone bloqueado. Permita o acesso nas configurações do navegador e tente novamente."
            : err?.message || "Erro ao conectar ao servidor SIP."
        );
        settle(false);
      }
    });
    connectingRef.current = attempt;
    try { return await attempt; } finally { connectingRef.current = null; }
  }, [hasSipConfig, operator, claimPrimaryTab, cleanupCall]);


  // AUTO-CONNECT SIP: if credentials are available, keep the browser webphone registered.
  useEffect(() => {
    if (!user?.id || !activeCompanyId || !operator?.id || !hasSipConfig || !isPrimaryTab) return;
    if (status !== "disconnected") return;
    if (webphoneRef.current?.getUserAgent()?.isRegistered?.()) return;

    const timer = window.setTimeout(() => {
      void connectSIP();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    user?.id,
    activeCompanyId,
    operator?.id,
    operator?.extension,
    operator?.sip_domain,
    operator?.sip_password,
    hasSipConfig,
    isPrimaryTab,
    status,
    connectSIP,
  ]);

  const disconnectSIP = useCallback(() => {
    intentionalDisconnectRef.current = true;
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
    setErrorMessage(null);
  }, [cleanupCall]);

  const toggleOnline = useCallback(
    async (forceState?: boolean) => {
      const nextState = forceState !== undefined ? forceState : !isOnline;
      if (nextState) {
        await connectSIP();
      } else {
        disconnectSIP();
      }
    },
    [isOnline, connectSIP, disconnectSIP]
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
      if (activeCallDataRef.current) {
        toast({ title: "Chamada em andamento", description: "Encerre a chamada atual antes de discar novamente." });
        return false;
      }
      if (!isPrimaryTab) {
        toast({
          title: "Webphone ativo em outra aba",
          description: "Assuma o controle do Webphone nesta aba antes de realizar a ligação.",
          variant: "destructive",
        });
        return false;
      }

      if (!webphoneRef.current?.getUserAgent()?.isRegistered?.()) {
        if (!hasSipConfig) {
          toast({
            title: "Webphone não configurado",
            description: "Configure o ramal em Configurações de Telefonia antes de realizar a ligação.",
            variant: "destructive",
          });
          return false;
        }

        const connected = await connectSIP();
        if (!connected || !webphoneRef.current?.getUserAgent()?.isRegistered?.()) {
          toast({
            title: "Webphone offline",
            description: "Não foi possível registrar o ramal SIP. Verifique as Configurações de Telefonia.",
            variant: "destructive",
          });
          return false;
        }
      }

      if (!operator?.id) {
        toast({
          title: "Erro de Operador",
          description: "Operador não carregado.",
          variant: "destructive",
        });
        return false;
      }

      // Solicitar acesso ao microfone somente quando a chamada realmente for iniciada.
      // Este stream é apenas um preflight de permissão e é liberado imediatamente;
      // a libwebphone abrirá o stream real quando a chamada SIP for estabelecida.
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({
          title: "Microfone indisponível",
          description: "Abra a Qualify em HTTPS e verifique as permissões do navegador.",
          variant: "destructive",
        });
        return false;
      }

      try {
        const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        permissionStream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        toast({
          title: "Microfone bloqueado",
          description:
            err?.name === "NotAllowedError"
              ? "Permita o acesso ao microfone para realizar a ligação."
              : err?.message || "Não foi possível acessar o microfone.",
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

        const updatedCall = {
          ...callData,
          callLogId: data.callLogId,
          externalCallId: data.callId,
        };
        activeCallDataRef.current = updatedCall;
        setActiveCall((prev) => ({
          ...prev,
          callLogId: data.callLogId,
          externalCallId: data.callId,
        }));

        setStatus("ringing");
        return true;
      } catch (err: any) {
        let message = err?.message || "Falha ao discar";
        if (err?.context?.json) {
          const body = await err.context.json().catch(() => null);
          if (body?.error) message = body.error;
        }
        console.error("[Webphone] Erro ao discar:", err);
        toast({
          title: "Falha na chamada",
          description: message,
          variant: "destructive",
        });
        cleanupCall();
        return false;
      }
    },
    [isPrimaryTab, hasSipConfig, connectSIP, operator?.id, cleanupCall, toast]
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
      if (!user?.id || !activeCompanyId) {
        return { success: false, error: "Selecione uma empresa antes de configurar o Webphone." };
      }

      try {
        let operatorId = operator?.id;
        if (!operatorId) {
          const { data: profile } = await supabase.from("profiles")
            .select("full_name, email").eq("id", user.id).maybeSingle();
          const { data: created, error: createError } = await supabase
            .from("call_operators")
            .insert({
              user_id: user.id,
              company_id: activeCompanyId,
              operator_name: profile?.full_name || profile?.email || "Operador",
              is_active: true,
              status: "offline",
            })
            .select("id")
            .single();
          if (createError || !created) throw createError || new Error("Falha ao criar operador.");
          operatorId = created.id;
        }
        const { data, error } = await supabase.functions.invoke("api4com-sync-operator", {
          body: {
            operator_id: operatorId,
            api4com_token: token,
          },
        });

        if (error || !data?.success) {
          return { success: false, error: data?.error || error?.message };
        }

        await fetchOperator();
        toast({
          title: "Ramal Sincronizado",
          description: data.webhookConfigured
            ? `Ramal ${data.sip?.extension} vinculado e webhook configurado.`
            : `Ramal ${data.sip?.extension} vinculado. Falhou a configuração do webhook; o histórico pode não atualizar.`,
          variant: data.webhookConfigured ? "default" : "destructive",
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [operator?.id, user?.id, activeCompanyId, fetchOperator, toast]
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
