import { supabase } from "@/integrations/supabase/client";
import { criafyService } from "./criafyService";
import { CriafyPublication, CriafyContent, CriafyMediaType, CriafyPublicationType } from "@/types/criafy";
import { SprintCard } from "@/features/sprint/types";

export type CriafyTargetFormat = "REELS" | "STORIES" | "FEED" | "CAROUSEL";

export interface CriafyTargetInfo {
  format: CriafyTargetFormat;
  label: string;
  matched: string;
}

/**
 * Detecta se um texto (título, descrição, etiqueta) contém uma menção de destino Criafy
 * Ex: @criafy/reels, @criafy/stories, @criafy/post, @criafy/carrossel
 */
export function extractCriafyTarget(text?: string | null): CriafyTargetInfo | null {
  if (!text) return null;

  const lower = text.toLowerCase();

  if (/@criafy\/(reels?|videos?)/i.test(lower)) {
    return { format: "REELS", label: "Instagram Reels", matched: "@criafy/reels" };
  }
  if (/@criafy\/(stories|story)/i.test(lower)) {
    return { format: "STORIES", label: "Instagram Stories", matched: "@criafy/stories" };
  }
  if (/@criafy\/(carrossel|carousel)/i.test(lower)) {
    return { format: "CAROUSEL", label: "Instagram Carrossel", matched: "@criafy/carrossel" };
  }
  if (/@criafy\/(post|feed|foto|imagem)/i.test(lower)) {
    return { format: "FEED", label: "Instagram Feed", matched: "@criafy/post" };
  }
  if (/@criafy\b/i.test(lower)) {
    // Default fallback quando apenas @criafy é mencionado
    return { format: "REELS", label: "Instagram Reels (Criafy)", matched: "@criafy" };
  }

  return null;
}

/**
 * Localiza o melhor arquivo de mídia anexado ao card do Sprint
 * (anexos do card, itens de checklist ou áudios gravados)
 */
export function findCardMediaAttachment(card: SprintCard): {
  url: string;
  name: string;
  type: string;
} | null {
  // 1. Anexos diretos do card
  if (card.attachments && card.attachments.length > 0) {
    const mediaAttachment = card.attachments.find((a) => {
      const mime = (a.file_type || "").toLowerCase();
      const name = (a.file_name || "").toLowerCase();
      return (
        mime.startsWith("video/") ||
        mime.startsWith("image/") ||
        mime.startsWith("audio/") ||
        /\.(mp4|mov|avi|mp3|m4a|wav|jpg|jpeg|png|webp)$/i.test(name)
      );
    });
    if (mediaAttachment?.file_url) {
      return {
        url: mediaAttachment.file_url,
        name: mediaAttachment.file_name,
        type: mediaAttachment.file_type || "video/mp4",
      };
    }
    // Fallback: primeiro anexo
    const first = card.attachments[0];
    if (first?.file_url) {
      return {
        url: first.file_url,
        name: first.file_name,
        type: first.file_type || "application/octet-stream",
      };
    }
  }

  // 2. Anexos em itens de checklist
  if (card.checklists) {
    for (const cl of card.checklists) {
      for (const item of cl.items || []) {
        if (item.attachment_url) {
          return {
            url: item.attachment_url,
            name: item.attachment_name || "anexo-checklist",
            type: item.attachment_type || "video/mp4",
          };
        }
      }
    }
  }

  return null;
}

export interface DispatchSprintToCriafyParams {
  companyId: string;
  card: SprintCard;
  mediaUrl?: string;
  scheduledAt?: string | null;
  targetFormat?: CriafyTargetFormat;
}

export interface DispatchSprintToCriafyResult {
  success: boolean;
  publication?: CriafyPublication;
  content?: CriafyContent;
  accountName?: string;
  scheduledAt?: string | null;
  error?: string;
}

/**
 * Despacha automaticamente uma tarefa do Sprint para o Criafy:
 * 1. Identifica a conta conectada na empresa
 * 2. Registra na Biblioteca de Conteúdos (criafy_contents)
 * 3. Cria a Publicação (criafy_publications) com formato e agendamento
 */
export async function dispatchSprintCardToCriafy({
  companyId,
  card,
  mediaUrl,
  scheduledAt,
  targetFormat,
}: DispatchSprintToCriafyParams): Promise<DispatchSprintToCriafyResult> {
  try {
    if (!companyId) throw new Error("companyId é obrigatório para despacho Criafy");

    // 1. Identifica formato alvo
    const detected = extractCriafyTarget(`${card.title} ${card.description}`);
    const format = targetFormat || detected?.format || "REELS";

    // 2. Busca conta ativa do Instagram vinculada à empresa
    const accounts = await criafyService.getAccounts(companyId);
    const activeAccount = accounts.find((a) => a.connection_status === "CONNECTED") || accounts[0];

    if (!activeAccount) {
      throw new Error(
        "Nenhuma conta do Instagram conectada na empresa. Conecte sua conta em Criafy > Contas Conectadas."
      );
    }

    // 3. Resolve mídia (fornecida ou encontrada no card)
    const resolvedMedia = mediaUrl ? { url: mediaUrl, name: card.title, type: "video/mp4" } : findCardMediaAttachment(card);

    let createdContent: CriafyContent | undefined = undefined;

    // 4. Se houver mídia, salva na Biblioteca de Conteúdos
    if (resolvedMedia?.url) {
      const isVideo =
        resolvedMedia.type.startsWith("video/") ||
        /\.(mp4|mov|avi|webm)$/i.test(resolvedMedia.url);

      const mediaType: CriafyMediaType = isVideo ? "VIDEO" : "IMAGE";

      createdContent = await criafyService.createContent(
        {
          company_id: companyId,
          title: card.title,
          media_url: resolvedMedia.url,
          media_type: mediaType,
          status: "ACTIVE",
          meta_validation_status: "VALID",
          ai_analysis: {
            source: "sprint_card",
            sprint_card_id: card.id,
            origin_board_id: card.board_id,
            dispatched_at: new Date().toISOString(),
          },
        },
        [activeAccount.id]
      );
    }

    // 5. Cria a Publicação
    const finalScheduledAt = scheduledAt || card.due_date || null;
    const publicationStatus = finalScheduledAt ? "SCHEDULED" : "DRAFT";

    // Limpa tags @criafy do título para ficar profissional na legenda
    const cleanTitle = card.title.replace(/@criafy\/\w+/gi, "").replace(/@criafy\b/gi, "").trim();
    const cleanDescription = (card.description || "").replace(/@criafy\/\w+/gi, "").replace(/@criafy\b/gi, "").trim();

    const caption = cleanDescription ? `${cleanTitle}\n\n${cleanDescription}` : cleanTitle;

    const publicationData: Partial<CriafyPublication> = {
      company_id: companyId,
      account_id: activeAccount.id,
      title: cleanTitle || card.title,
      caption,
      publication_type: format as CriafyPublicationType,
      media_url: resolvedMedia?.url || undefined,
      content_id: createdContent?.id || undefined,
      status: publicationStatus,
      scheduled_at: finalScheduledAt,
    };

    const publication = await criafyService.createPublication(publicationData);

    return {
      success: true,
      publication,
      content: createdContent,
      accountName: activeAccount.username,
      scheduledAt: finalScheduledAt,
    };
  } catch (err: any) {
    console.error("[sprintCriafyBridge] Erro ao despachar para Criafy:", err);
    return {
      success: false,
      error: err.message || "Erro desconhecido ao despachar para o Criafy",
    };
  }
}
