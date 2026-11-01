import webpush from "npm:web-push@3.6.7";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PushNotificationPayload {
  companyId: string;
  userIds: string[];
  title: string;
  body: string;
  messageId: string;
  conversationId?: string;
  mediaType?: string;
}

export async function dispatchWebPushNotification(
  supabase: SupabaseClient,
  payload: PushNotificationPayload,
) {
  if (!payload.companyId || !payload.messageId || !payload.userIds?.length) return;

  try {
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!publicKey || !privateKey) {
      console.warn("[push-dispatcher] VAPID keys not configured; delivery skipped.");
      return;
    }
    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:suporte@qualifys.app", publicKey, privateKey);

    const { data: members, error: memberError } = await supabase
      .from("company_members").select("user_id").eq("company_id", payload.companyId)
      .eq("is_active", true).in("user_id", [...new Set(payload.userIds)]);
    if (memberError) throw memberError;
    const permittedIds = (members || []).map((member) => member.user_id);
    if (!permittedIds.length) return;

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions").select("id, endpoint, p256dh, auth")
      .eq("company_id", payload.companyId).in("user_id", permittedIds).is("revoked_at", null);
    if (error) throw error;
    if (!subscriptions?.length) return;

    let displayBody = payload.body;
    switch (payload.mediaType) {
      case "image": displayBody = displayBody ? `📷 ${displayBody}` : "📷 Enviou uma imagem"; break;
      case "audio": displayBody = "🎤 Enviou um áudio"; break;
      case "video": displayBody = displayBody ? `🎥 ${displayBody}` : "🎥 Enviou um vídeo"; break;
      case "document": displayBody = displayBody ? `📎 ${displayBody}` : "📎 Enviou um documento"; break;
      case "location": displayBody = "📍 Enviou uma localização"; break;
    }

    const pushData = {
      title: payload.title || "Nova mensagem",
      body: displayBody || "Você recebeu uma nova mensagem.",
      icon: "/logo-dark.png",
      badge: "/logo-dark.png",
      conversationId: payload.conversationId,
      companyId: payload.companyId,
      tag: `message:${payload.messageId}`,
    };

    const results = await Promise.allSettled(subscriptions.map(async (subscription) => {
      const { error: claimError } = await supabase.from("push_deliveries").insert({
        message_id: payload.messageId,
        subscription_id: subscription.id,
      });
      if (claimError?.code === "23505") return;
      if (claimError) throw claimError;
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, JSON.stringify(pushData), { TTL: 60 * 60 });
        await supabase.from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() }).eq("id", subscription.id);
      } catch (sendError) {
        const status = (sendError as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions")
            .update({ revoked_at: new Date().toISOString() }).eq("id", subscription.id);
        } else {
          await supabase.from("push_deliveries").delete()
            .eq("message_id", payload.messageId).eq("subscription_id", subscription.id);
        }
        throw sendError;
      }
    }));
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) console.warn(`[push-dispatcher] Failed deliveries: ${failures.length}/${results.length}`);
  } catch (error) {
    console.error("[push-dispatcher] Error dispatching push notifications:", error);
  }
}
