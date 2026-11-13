import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callTikTokApi, tiktokEnv, usableTikTokToken } from "../_shared/criafyTikTokApi.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const mediaBase = "https://qualify-supabase.d2x.site/storage/v1/object/public/media/";
function verifiedMediaUrl(mediaUrl: string, companyId: string): string {
  if (mediaUrl.startsWith(mediaBase)) {
    const path = mediaUrl.slice(mediaBase.length);
    if (!path.startsWith(`${companyId}/`) || path.includes("..")) {
      throw new Error("Mídia fora deste workspace.");
    }
    return `https://qualifys.app/api/criafy-media-stream?path=${encodeURIComponent(path)}`;
  }
  const url = new URL(mediaUrl);
  if (url.origin === "https://qualifys.app" && url.pathname === "/api/criafy-media-stream" &&
    url.searchParams.get("manifest")?.startsWith(`${companyId}/`)) {
    return url.toString();
  }
  throw new Error("A mídia precisa estar no armazenamento da Criafy antes de publicar no TikTok.");
}

type PostOptions = {
  title: string;
  privacy_level: string;
  allow_comment: boolean;
  allow_duet: boolean;
  allow_stitch: boolean;
  commercial_content: boolean;
  own_brand: boolean;
  branded_content: boolean;
  is_aigc: boolean;
  consent: boolean;
};

type CreatorInfo = {
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
};
type VideoContent = { duration_seconds: number | null; file_size_bytes: number | null; mime_type: string | null };

function validateOptions(options: PostOptions, creator: CreatorInfo, content: VideoContent) {
  for (const key of ["allow_comment", "allow_duet", "allow_stitch", "commercial_content",
    "own_brand", "branded_content", "is_aigc", "consent"] as const) {
    if (typeof options[key] !== "boolean") throw new Error("Opções de postagem inválidas.");
  }
  if (typeof options.title !== "string" || options.title.length > 2200) {
    throw new Error("A legenda TikTok deve ter até 2200 caracteres.");
  }
  if (!creator.privacy_level_options?.includes(options.privacy_level)) {
    throw new Error("Escolha uma opção de privacidade disponível para esta conta.");
  }
  if (options.allow_comment && creator.comment_disabled ||
      options.allow_duet && creator.duet_disabled ||
      options.allow_stitch && creator.stitch_disabled) {
    throw new Error("Uma interação escolhida está desativada nas configurações do criador.");
  }
  if (options.commercial_content && !options.own_brand && !options.branded_content) {
    throw new Error("Informe se o conteúdo promove sua marca ou outra marca.");
  }
  if (!options.commercial_content && (options.own_brand || options.branded_content)) {
    throw new Error("Ative a declaração de conteúdo comercial para indicar marcas.");
  }
  if (options.branded_content && !["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS"].includes(options.privacy_level)) {
    throw new Error("Conteúdo de parceria precisa estar visível ao público ou a amigos.");
  }
  if (!options.consent) throw new Error("Confirme o envio do vídeo e os termos do TikTok.");
  if (!content.duration_seconds || content.duration_seconds > creator.max_video_post_duration_sec) {
    throw new Error("A duração do vídeo excede o limite desta conta TikTok ou não foi medida.");
  }
  if (!content.file_size_bytes || content.file_size_bytes > 4 * 1024 ** 3) {
    throw new Error("Arquivo de vídeo inválido ou maior que 4 GB.");
  }
  if (!/^(video\/mp4|video\/quicktime|video\/webm)$/.test(content.mime_type || "")) {
    throw new Error("Formato não aceito pelo TikTok. Use MP4, MOV ou WebM.");
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Método não permitido." }, 405);
  let publicationId: string | null = null;
  let acceptedByTikTok = false;
  let admin: ReturnType<typeof createClient> | undefined;
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return reply({ error: "Sessão necessária." }, 401);
    const supabaseUrl = tiktokEnv("SUPABASE_URL");
    admin = createClient(supabaseUrl, tiktokEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const serviceMode = authorization === `Bearer ${tiktokEnv("SUPABASE_SERVICE_ROLE_KEY")}`;
    const userClient = serviceMode ? null : createClient(supabaseUrl, tiktokEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = userClient
      ? await userClient.auth.getUser() : { data: { user: null }, error: null };
    if (!serviceMode && (userError || !user)) return reply({ error: "Sessão inválida." }, 401);
    let { action, companyId, accountId, contentId, publicationId: statusPublicationId,
      options, requestId } = await request.json();
    let scheduledPublication: Record<string, any> | null = null;
    if (serviceMode) {
      if (!["run-scheduled", "status"].includes(action) || !statusPublicationId) {
        return reply({ error: "Ação de agendamento inválida." }, 403);
      }
      const { data } = await admin.from("criafy_publications")
        .select("id,company_id,social_account_id,content_id,caption,tiktok_options,tiktok_request_id,status,scheduled_at")
        .eq("id", statusPublicationId).eq("publication_type", "TIKTOK_VIDEO")
        .not("scheduled_at", "is", null).single();
      if (!data || (action === "run-scheduled" &&
          (data.status !== "SCHEDULED" || new Date(data.scheduled_at).getTime() > Date.now())) ||
          (action === "status" && data.status !== "PUBLISHING")) {
        return reply({ error: "Publicação agendada não encontrada ou fora do horário." }, 404);
      }
      companyId = data.company_id; accountId = data.social_account_id;
      if (action === "run-scheduled") {
        scheduledPublication = data;
        action = "publish"; contentId = data.content_id; requestId = data.tiktok_request_id;
        options = { ...data.tiktok_options, title: data.caption || "",
          consent: Boolean(data.tiktok_options?.consented_at) };
      }
    }
    if (!companyId || !accountId) return reply({ error: "Workspace ou conta ausente." }, 400);
    if (!serviceMode) {
      const { data: member } = await admin.from("company_members").select("id")
        .eq("company_id", companyId).eq("user_id", user!.id).eq("is_active", true).maybeSingle();
      if (!member) return reply({ error: "Sem acesso ao workspace." }, 403);
    }
    const { data: account } = await admin.from("criafy_social_accounts")
      .select("id,provider,connection_status").eq("id", accountId)
      .eq("company_id", companyId).eq("provider", "TIKTOK").single();
    if (!account || account.connection_status !== "CONNECTED") {
      return reply({ error: "Conta TikTok não conectada neste workspace." }, 404);
    }
    const accessToken = await usableTikTokToken(admin, companyId, accountId);

    if (action === "creator-info") {
      const creator = await callTikTokApi(
        "https://open.tiktokapis.com/v2/post/publish/creator_info/query/", accessToken, {},
      );
      return reply({ success: true, creator });
    }

    if (action === "status") {
      const { data: publication } = await admin.from("criafy_publications")
        .select("id,status,tiktok_publish_id").eq("id", statusPublicationId)
        .eq("company_id", companyId).eq("social_account_id", accountId).single();
      if (!publication?.tiktok_publish_id) return reply({ error: "Publicação TikTok não encontrada." }, 404);
      if (publication.status === "PUBLISHED" || publication.status === "FAILED") {
        return reply({ success: true, status: publication.status });
      }
      const result = await callTikTokApi(
        "https://open.tiktokapis.com/v2/post/publish/status/fetch/", accessToken,
        { publish_id: publication.tiktok_publish_id },
      );
      const status = result.status === "PUBLISH_COMPLETE" ? "PUBLISHED"
        : result.status === "FAILED" ? "FAILED" : "PUBLISHING";
      await admin.from("criafy_publications").update({
        status,
        published_at: status === "PUBLISHED" ? new Date().toISOString() : null,
        tiktok_failure_reason: result.fail_reason || null,
        updated_at: new Date().toISOString(),
      }).eq("id", publication.id).eq("company_id", companyId);
      if (status !== "PUBLISHING") {
        await admin.from("criafy_publication_attempts").insert({
          company_id: companyId, publication_id: publication.id, attempt_number: 1,
          status: status === "PUBLISHED" ? "SUCCESS" : "FAILED",
          error_code: result.fail_reason || null,
          raw_response_sanitized: { tiktok_status: result.status, publish_id: publication.tiktok_publish_id },
        });
      }
      return reply({ success: true, status, fail_reason: result.fail_reason || null });
    }

    if (action !== "publish" || !contentId || !options || !requestId) {
      return reply({ error: "Solicitação de publicação incompleta." }, 400);
    }
    const { data: previous } = scheduledPublication ? { data: null } : await admin.from("criafy_publications")
      .select("id,status,tiktok_publish_id").eq("company_id", companyId)
      .eq("tiktok_request_id", requestId).maybeSingle();
    if (previous) {
      if (previous.tiktok_publish_id) return reply({ success: true, publication: previous });
      return reply({ error: "O envio anterior não tem confirmação. Verifique o histórico antes de tentar novamente." }, 409);
    }

    const { data: content } = await admin.from("criafy_contents")
      .select("id,company_id,media_url,media_type,mime_type,duration_seconds,file_size_bytes")
      .eq("id", contentId).eq("company_id", companyId).eq("status", "ACTIVE").single();
    if (!content || content.media_type !== "VIDEO") return reply({ error: "Escolha um vídeo da biblioteca deste workspace." }, 400);
    const creator = await callTikTokApi(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/", accessToken, {},
    );
    validateOptions(options, creator, content);
    const videoUrl = verifiedMediaUrl(content.media_url, companyId);

    const publicationMutation = scheduledPublication
      ? admin.from("criafy_publications").update({ status: "PUBLISHING", updated_at: new Date().toISOString() })
        .eq("id", scheduledPublication.id).eq("company_id", companyId).eq("status", "SCHEDULED")
      : admin.from("criafy_publications").insert({
        company_id: companyId, account_id: null, social_account_id: accountId,
        content_id: contentId, publication_type: "TIKTOK_VIDEO", caption: options.title,
        status: "PUBLISHING", tiktok_request_id: requestId,
        tiktok_options: {
          privacy_level: options.privacy_level,
          allow_comment: options.allow_comment, allow_duet: options.allow_duet,
          allow_stitch: options.allow_stitch, commercial_content: options.commercial_content,
          own_brand: options.own_brand, branded_content: options.branded_content,
          is_aigc: options.is_aigc, consented_at: new Date().toISOString(),
        },
        created_by: user!.id,
      });
    const { data: publication, error: insertError } = await publicationMutation.select("id,status").single();
    if (insertError || !publication) throw new Error(insertError?.message || "Falha ao registrar publicação.");
    publicationId = publication.id;

    const initialized = await callTikTokApi(
      "https://open.tiktokapis.com/v2/post/publish/video/init/", accessToken,
      {
        post_info: {
          title: options.title, privacy_level: options.privacy_level,
          disable_comment: !options.allow_comment,
          disable_duet: !options.allow_duet,
          disable_stitch: !options.allow_stitch,
          brand_content_toggle: options.commercial_content && options.branded_content,
          brand_organic_toggle: options.commercial_content && options.own_brand,
          is_aigc: options.is_aigc,
        },
        source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
      },
    );
    if (!initialized.publish_id) throw new Error("TikTok não retornou o ID da publicação.");
    acceptedByTikTok = true;
    const { error: updateError } = await admin.from("criafy_publications")
      .update({ tiktok_publish_id: initialized.publish_id, updated_at: new Date().toISOString() })
      .eq("id", publication.id).eq("company_id", companyId);
    if (updateError) throw new Error("Vídeo enviado, mas o ID da publicação não foi salvo. Contate o suporte antes de tentar novamente.");
    return reply({ success: true, publication: { ...publication, tiktok_publish_id: initialized.publish_id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao publicar no TikTok.";
    if (publicationId && admin && !acceptedByTikTok) {
      await admin.from("criafy_publications").update({
        status: "FAILED", tiktok_failure_reason: message, updated_at: new Date().toISOString(),
      }).eq("id", publicationId);
    }
    return reply({ error: message }, 400);
  }
});
