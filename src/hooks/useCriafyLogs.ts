import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CriafyLogItem {
  id: string;
  attemptedAt: string;
  formattedDate: string;
  status: "SUCCESS" | "FAILED" | "PUBLISHING";
  attemptNumber: number;
  errorCode: string | null;
  errorMessage: string | null;
  companyId: string;
  publicationId: string;
  rawResponseSanitized: any;
  publication?: {
    id: string;
    publicationType: string;
    caption?: string | null;
    status: string;
    scheduledAt?: string | null;
    publishedAt?: string | null;
    igMediaId?: string | null;
    igPermalink?: string | null;
    account?: {
      id: string;
      username: string;
      name?: string | null;
      profilePictureUrl?: string | null;
      instagramAccountId?: string | null;
    } | null;
    content?: {
      id: string;
      title: string;
      mediaType: string;
      mediaUrl: string;
      thumbnailUrl?: string | null;
      fileSizeBytes?: number | null;
      durationSeconds?: number | null;
      width?: number | null;
      height?: number | null;
      aspectRatio?: string | null;
    } | null;
  } | null;
}

export function useCriafyLogs() {
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["criafy-logs"],
    queryFn: async (): Promise<CriafyLogItem[]> => {
      const { data, error } = await (supabase as any)
        .from("criafy_publication_attempts")
        .select(`
          id,
          attempted_at,
          status,
          attempt_number,
          error_code,
          error_message,
          company_id,
          publication_id,
          raw_response_sanitized,
          publication:criafy_publications(
            id,
            publication_type,
            caption,
            status,
            scheduled_at,
            published_at,
            ig_media_id,
            ig_permalink,
            account:criafy_instagram_accounts(
              id,
              username,
              name,
              profile_picture_url,
              instagram_account_id
            ),
            content:criafy_contents(
              id,
              title,
              media_type,
              media_url,
              thumbnail_url,
              file_size_bytes,
              duration_seconds,
              width,
              height,
              aspect_ratio
            )
          )
        `)
        .order("attempted_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Erro ao buscar logs do Criafy:", error);
        throw error;
      }

      return (data || []).map((item: any) => {
        const pub = item.publication;
        const acc = pub?.account;
        const content = pub?.content;

        return {
          id: item.id,
          attemptedAt: item.attempted_at,
          formattedDate: item.attempted_at
            ? new Date(item.attempted_at).toLocaleString("pt-BR")
            : "-",
          status: item.status,
          attemptNumber: item.attempt_number || 1,
          errorCode: item.error_code,
          errorMessage: item.error_message,
          companyId: item.company_id,
          publicationId: item.publication_id,
          rawResponseSanitized: item.raw_response_sanitized,
          publication: pub
            ? {
                id: pub.id,
                publicationType: pub.publication_type,
                caption: pub.caption,
                status: pub.status,
                scheduledAt: pub.scheduled_at,
                publishedAt: pub.published_at,
                igMediaId: pub.ig_media_id,
                igPermalink: pub.ig_permalink,
                account: acc
                  ? {
                      id: acc.id,
                      username: acc.username,
                      name: acc.name,
                      profilePictureUrl: acc.profile_picture_url,
                      instagramAccountId: acc.instagram_account_id,
                    }
                  : null,
                content: content
                  ? {
                      id: content.id,
                      title: content.title,
                      mediaType: content.media_type,
                      mediaUrl: content.media_url,
                      thumbnailUrl: content.thumbnail_url,
                      fileSizeBytes: content.file_size_bytes,
                      durationSeconds: content.duration_seconds,
                      width: content.width,
                      height: content.height,
                      aspectRatio: content.aspect_ratio,
                    }
                  : null,
              }
            : null,
        };
      });
    },
    refetchInterval: 10000, // Atualiza a cada 10s para acompanhar publicações em segundo plano
  });

  return { logs, isLoading, refetch };
}
