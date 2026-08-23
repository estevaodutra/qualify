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
    // 1. Fetch active push subscriptions for targeted user IDs
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", payload.userIds)
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

    // Record last_used_at timestamp on used subscriptions
    const subIds = subscriptions.map((s) => s.id);
    await supabase
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .in("id", subIds);

  } catch (err) {
    console.error("[push-dispatcher] Error dispatching push notifications:", err);
  }
}
