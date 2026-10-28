import { supabase } from "@/integrations/supabase/client";

export interface CardMentionNotificationParams {
  companyId: string;
  boardId: string;
  cardId: string;
  cardTitle: string;
  authorUserId: string;
  authorName: string;
  mentionedUserIds: string[];
  contextType: "comment" | "checklist" | "description";
  contextText: string;
  commentId?: string;
  checklistItemId?: string;
}

export interface ParsedNotificationTarget {
  type: "sprint_card" | "criafy_publication" | "external" | "unknown";
  boardId?: string;
  cardId?: string;
  url?: string;
}

/**
 * Decodifica o target de navegação a partir do campo 'entity' ou 'link' de um alerta
 */
export function parseNotificationTarget(
  entity?: string | null,
  link?: string | null
): ParsedNotificationTarget {
  if (link && link.includes("/sprint/b/")) {
    const urlMatch = link.match(/\/sprint\/b\/([a-zA-Z0-9_-]+)/);
    const cardMatch = link.match(/cardId=([a-zA-Z0-9_-]+)/);
    return {
      type: "sprint_card",
      boardId: urlMatch ? urlMatch[1] : undefined,
      cardId: cardMatch ? cardMatch[1] : undefined,
      url: link,
    };
  }

  if (entity && entity.startsWith("sprint_card:")) {
    const parts = entity.split(":");
    // formato: sprint_card:boardId:cardId
    const boardId = parts[1];
    const cardId = parts[2];
    return {
      type: "sprint_card",
      boardId,
      cardId,
      url: `/sprint/b/${boardId}?cardId=${cardId}`,
    };
  }

  if (entity && entity.startsWith("criafy_publication:")) {
    return {
      type: "criafy_publication",
      url: link || "/criafy",
    };
  }

  if (link) {
    const isHttp = link.startsWith("http://") || link.startsWith("https://");
    return {
      type: isHttp ? "external" : "unknown",
      url: link,
    };
  }

  return { type: "unknown" };
}

/**
 * Registra a menção nas tabelas do sistema e despacha o evento de notificação em tempo real
 */
export async function notifySprintCardMention(params: CardMentionNotificationParams): Promise<void> {
  const {
    companyId,
    boardId,
    cardId,
    cardTitle,
    authorUserId,
    authorName,
    mentionedUserIds,
    contextType,
    contextText,
    commentId,
    checklistItemId,
  } = params;

  if (!mentionedUserIds || mentionedUserIds.length === 0) return;

  const contextLabel =
    contextType === "comment"
      ? "um comentário"
      : contextType === "checklist"
      ? "um item do checklist"
      : "na descrição";

  const cleanSnippet = (contextText || "").replace(/<[^>]*>?/gm, "").trim();
  const previewSnippet =
    cleanSnippet.length > 75 ? `${cleanSnippet.slice(0, 75)}...` : cleanSnippet;

  const title = `Você foi notificado no card "${cardTitle || "Cartão"}"`;
  const description = `${authorName || "Um membro"} mencionou você em ${contextLabel}${
    previewSnippet ? `: "${previewSnippet}"` : ""
  }`;
  const entity = `sprint_card:${boardId}:${cardId}`;
  const link = `/sprint/b/${boardId}?cardId=${cardId}`;

  // Executar para cada membro mencionado
  for (const recipientUserId of mentionedUserIds) {
    try {
      // 1. Inserir em sprint_mentions
      try {
        await (supabase as any).from("sprint_mentions").insert({
          company_id: companyId,
          board_id: boardId,
          card_id: cardId,
          checklist_item_id: checklistItemId || null,
          comment_id: commentId || null,
          mentioned_user_id: recipientUserId,
          created_by: authorUserId || null,
        });
      } catch (err) {
        console.warn("[notificationService] Falha não impeditiva ao gravar sprint_mentions:", err);
      }

      // 2. Inserir em alerts (centro de notificações do sistema)
      const alertPayload: any = {
        company_id: companyId,
        user_id: recipientUserId,
        severity: "info",
        title,
        description,
        entity,
        read: false,
      };

      // Tenta inserir com link, se der erro tenta sem a coluna link
      const { data: insertedAlert, error: alertError } = await (supabase as any)
        .from("alerts")
        .insert({ ...alertPayload, link })
        .select()
        .single();

      const createdAlertId = insertedAlert?.id || `temp-${Date.now()}`;

      if (alertError) {
        // Fallback caso a coluna link ainda não exista na migration
        await (supabase as any).from("alerts").insert(alertPayload);
      }

      // 3. Emitir broadcast via Supabase Realtime
      const realtimeChannel = supabase.channel(`notifications-${companyId}`);
      realtimeChannel.send({
        type: "broadcast",
        event: "mention_notification",
        payload: {
          id: createdAlertId,
          userId: recipientUserId,
          title,
          description,
          boardId,
          cardId,
          cardTitle,
          authorName,
          entity,
          link,
          created_at: new Date().toISOString(),
        },
      });

      // 4. Emitir evento local para resposta imediata
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("app:notification_popup", {
            detail: {
              id: createdAlertId,
              userId: recipientUserId,
              title,
              description,
              boardId,
              cardId,
              cardTitle,
              authorName,
              entity,
              link,
              created_at: new Date().toISOString(),
            },
          })
        );
      }
    } catch (err) {
      console.error("[notificationService] Erro ao disparar notificação:", err);
    }
  }
}
