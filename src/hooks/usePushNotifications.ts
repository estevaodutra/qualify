import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
let publicKeyRequest: Promise<string> | undefined;

function getPublicKey(): Promise<string> {
  if (VAPID_PUBLIC_KEY) return Promise.resolve(VAPID_PUBLIC_KEY);
  publicKeyRequest ??= supabase.functions.invoke<{ publicKey: string }>("push-config")
    .then(({ data, error }) => {
      if (error) throw error;
      if (!data?.publicKey) throw new Error("A chave pública de notificações não está disponível.");
      return data.publicKey;
    })
    .catch((error) => {
      publicKeyRequest = undefined;
      throw error;
    });
  return publicKeyRequest;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function saveSubscription(userId: string, companyId: string, subscription: PushSubscription) {
  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys?.auth) throw new Error("Assinatura Push sem chaves do dispositivo.");
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: userId,
    company_id: companyId,
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: navigator.userAgent,
    device_name: /mobile/i.test(navigator.userAgent) ? "Mobile Device" : "Desktop Device",
    updated_at: new Date().toISOString(),
    revoked_at: null,
  }, { onConflict: "user_id,endpoint" });
  if (error) throw error;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync current subscription status
  useEffect(() => {
    let cancelled = false;
    setIsSubscribed(false);
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !user || !activeCompanyId || Notification.permission !== "granted") {
      return;
    }

    navigator.serviceWorker.getRegistration().then(async (registration) => {
      if (!registration) return;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;
      await saveSubscription(user.id, activeCompanyId, subscription);
      if (!cancelled) setIsSubscribed(true);
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [user, activeCompanyId]);

  // Request permission and subscribe to Web Push
  const subscribe = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      toast.error("Notificações Push não são suportadas neste navegador.");
      return false;
    }

    if (!user || !activeCompanyId) {
      toast.error("Você precisa estar autenticado em uma organização.");
      return false;
    }

    setIsLoading(true);
    try {
      // 1. Request permission if default
      const currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);

      if (currentPermission !== "granted") {
        toast.error("Permissão de notificação negada. Ative nas configurações do seu navegador.");
        setIsLoading(false);
        return false;
      }

      // 2. Ensure Service Worker is registered and ready
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
      }

      await navigator.serviceWorker.ready;

      // 3. Subscribe via PushManager
      const convertedVapidKey = urlBase64ToUint8Array(await getPublicKey());
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // Keep the browser subscription and the server record in sync.
      await saveSubscription(user.id, activeCompanyId, subscription);

      setIsSubscribed(true);
      toast.success("Notificações de novas mensagens ativadas com sucesso!");
      return true;
    } catch (err: unknown) {
      console.error("Push subscription error:", err);
      toast.error(`Erro ao ativar notificações: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Unsubscribe from Web Push
  const unsubscribe = async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        if (user) {
          await supabase
            .from("push_subscriptions")
            .update({ revoked_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .eq("endpoint", endpoint);
        }
      }

      setIsSubscribed(false);
      toast.info("Notificações desativadas.");
    } catch (err: unknown) {
      console.error("Unsubscribe error:", err);
      toast.error("Erro ao desativar notificações.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
