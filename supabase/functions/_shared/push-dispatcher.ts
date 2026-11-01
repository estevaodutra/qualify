import webpush from "npm:web-push@3.6.7";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PushNotificationPayload {
  companyId: string;
  userIds: string[];
  title: string;
  body: string;
  conversationId?: string;
  mediaType?: string;
}

export async function dispatchWebPushNotification(
  supabase: SupabaseClient,
  payload: PushNotificationPayload
) {
  if (!payload.userIds || payload.userIds.length === 0) return;

  try {
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:suporte@qualifys.app";
    if (!publicKey || !privateKey) {
      console.warn("[push-dispatcher] VAPID keys not configured; push delivery skipped.");
      return;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    // 1. Fetch active push subscriptions for targeted user IDs
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", payload.userIds)
      .eq("company_id", payload.companyId)
      .is("revoked_at", null);

    if (error || !subscriptions || subscriptions.length === 0) {
      console.log(`[push-dispatcher] No active push subscriptions found for target users.`);
      return;
    }

    // Format media previews if present
    let displayBody = payload.body;
    if (payload.mediaType) {
      switch (payload.mediaType) {
        case "image": displayBody = displayBody ? `📷 ${displayBody}` : "📷 Enviou uma imagem"; break;
        case "audio": displayBody = "🎤 Enviou um áudio"; break;
        case "video": displayBody = displayBody ? `🎥 ${displayBody}` : "🎥 Enviou um vídeo"; break;
        case "document": displayBody = displayBody ? `📎 ${displayBody}` : "📎 Enviou um documento"; break;
        case "location": displayBody = "📍 Enviou uma localização"; break;
      }
    }

    const pushData = {
      title: payload.title || "Nova mensagem",
      body: displayBody || "Você recebeu uma nova mensagem.",
      icon: "/logo-dark.png",
      badge: "/logo-dark.png",
      conversationId: payload.conversationId,
      companyId: payload.companyId,
      url: payload.conversationId ? `/chat?conversationId=${payload.conversationId}` : "/chat",
      tag: payload.conversationId ? `conversation:${payload.conversationId}` : undefined,
    };

    console.log(`[push-dispatcher] Dispatching push to ${subscriptions.length} subscription endpoints...`);

    const results = await Promise.allSettled(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, JSON.stringify(pushData), { TTL: 60 * 60 });
        await supabase.from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", subscription.id);
      } catch (error: any) {
        const status = error?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", subscription.id);
        }
        throw error;
      }
    }));
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length) console.warn(`[push-dispatcher] Failed deliveries: ${failed.length}/${results.length}`);

  } catch (err) {
    console.error("[push-dispatcher] Error dispatching push notifications:", err);
  }
}
