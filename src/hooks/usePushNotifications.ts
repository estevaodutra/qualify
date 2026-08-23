import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

// Default VAPID Public Key for Web Push (overridable by VITE_VAPID_PUBLIC_KEY)
const DEFAULT_VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-Skv69yViEuiBIa-Ib9-Skv69yViEuiBIa";

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
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(subscription));
    }).catch(console.error);
  }, [user, activeCompanyId]);

  // Request permission and subscribe to Web Push
  const subscribe = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
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
      const convertedVapidKey = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      const subscriptionJson = subscription.toJSON();
      const endpoint = subscription.endpoint;
      const p256dh = subscriptionJson.keys?.p256dh || "";
      const auth = subscriptionJson.keys?.auth || "";

      // 4. Store/Upsert in Supabase push_subscriptions table
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: user.id,
            company_id: activeCompanyId,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            device_name: /mobile/i.test(navigator.userAgent) ? "Mobile Device" : "Desktop Device",
            updated_at: new Date().toISOString(),
            revoked_at: null,
          },
          { onConflict: "user_id,endpoint" }
        );

      if (error) throw error;

      setIsSubscribed(true);
      toast.success("Notificações de novas mensagens ativadas com sucesso!");
      return true;
    } catch (err: any) {
      console.error("Push subscription error:", err);
      toast.error(`Erro ao ativar notificações: ${err.message || err}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Unsubscribe from Web Push
  const unsubscribe = async () => {
    if (!("serviceWorker" in navigator)) return;

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
    } catch (err: any) {
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
