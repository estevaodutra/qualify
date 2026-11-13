import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { usableYouTubeToken, youtubeEnv, youtubeJson } from "../_shared/criafyYouTubeApi.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const CHUNK_SIZE = 8 * 1024 * 1024;
const mediaBase = "https://qualify-supabase.d2x.site/storage/v1/object/public/media/";

function safeMediaUrl(raw: string, companyId: string): string {
  if (raw.startsWith(mediaBase)) {
    const path = raw.slice(mediaBase.length);
    if (!path.startsWith(`${companyId}/`) || path.includes("..") || /[?#]/.test(path)) {
      throw new Error("Vídeo fora do armazenamento deste workspace.");
    }
    return `https://qualifys.app/api/criafy-media-stream?path=${encodeURIComponent(path)}`;
  }
  const url = new URL(raw);
  if (url.origin === "https://qualifys.app" && url.pathname === "/api/criafy-media-stream" &&
    ["path", "manifest"].some((key) => url.searchParams.get(key)?.startsWith(`${companyId}/`)) &&
    !url.searchParams.toString().includes("..")) return url.toString();
  throw new Error("Escolha um vídeo da biblioteca do Criafy.");
}

type ShortOptions = {
  title: string;
  description: string;
  privacy: "private" | "unlisted" | "public";
  madeForKids: boolean;
  containsSyntheticMedia: boolean;
  consent: boolean;
};

function validateShort(options: ShortOptions, content: {
  media_type: string; duration_seconds: number | null; width: number | null;
  height: number | null; file_size_bytes: number | null; mime_type: string | null;
}) {
  if (content.media_type !== "VIDEO" || !content.duration_seconds || content.duration_seconds > 180 ||
      !content.width || !content.height || content.width > content.height) {
    throw new Error("Shorts precisam ser vídeos quadrados ou verticais com até 3 minutos e dimensões medidas.");
  }
  if (!content.file_size_bytes || content.file_size_bytes > 2 * 1024 ** 3 ||
      !/^video\/(mp4|quicktime|webm)$/.test(content.mime_type || "")) {
    throw new Error("Use um vídeo MP4, MOV ou WebM de até 2 GB.");
  }
  if (typeof options.title !== "string" || !options.title.trim() ||
      options.title.length > 100 || /[<>]/.test(options.title)) {
    throw new Error("Informe um título de até 100 caracteres, sem < ou >.");
  }
  if (typeof options.description !== "string" ||
      new TextEncoder().encode(options.description).length > 5000 || /[<>]/.test(options.description)) {
    throw new Error("A descrição deve ter até 5000 bytes, sem < ou >.");
  }
  if (!["private", "unlisted", "public"].includes(options.privacy) ||
      typeof options.madeForKids !== "boolean" ||
      typeof options.containsSyntheticMedia !== "boolean" || options.consent !== true) {
    throw new Error("Revise a visibilidade, a indicação infantil e a confirmação do envio.");
  }
}

function uploadLocation(response: Response): string {
  const location = response.headers.get("Location") || "";
  const url = new URL(location);
  if (url.origin !== "https://www.googleapis.com" ||
      url.pathname !== "/upload/youtube/v3/videos") {
    throw new Error("YouTube não retornou uma sessão de upload válida.");
  }
  return url.toString();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Método não permitido." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return reply({ error: "Sessão necessária." }, 401);
    const supabaseUrl = youtubeEnv("SUPABASE_URL");
    const userClient = createClient(supabaseUrl, youtubeEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return reply({ error: "Sessão inválida." }, 401);
    const admin = createClient(supabaseUrl, youtubeEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const { action, companyId, accountId, contentId, options, requestId, publicationId } = await request.json();
    if (!companyId || !accountId) return reply({ error: "Workspace ou canal ausente." }, 400);
    const { data: member } = await admin.from("company_members").select("id")
      .eq("company_id", companyId).eq("user_id", user.id).eq("is_active", true).maybeSingle();
    if (!member) return reply({ error: "Sem acesso ao workspace." }, 403);
    const { data: account } = await admin.from("criafy_social_accounts")
      .select("id,connection_status").eq("id", accountId).eq("company_id", companyId)
      .eq("provider", "YOUTUBE").single();
    if (!account || account.connection_status !== "CONNECTED") {
      return reply({ error: "Canal YouTube não conectado neste workspace." }, 404);
    }
    const token = await usableYouTubeToken(admin, companyId, accountId);

    if (action === "status" || action === "upload-step") {
      const { data: publication } = await admin.from("criafy_publications")
        .select("id,status,youtube_video_id,content_id,youtube_uploaded_bytes,youtube_failure_reason")
        .eq("id", publicationId).eq("company_id", companyId).eq("social_account_id", accountId)
        .eq("publication_type", "YOUTUBE_SHORT").single();
      if (!publication) return reply({ error: "Short não encontrado." }, 404);
      if (publication.status === "FAILED" || publication.status === "PUBLISHED") {
        return reply({ success: true, publication });
      }
      if (publication.youtube_video_id) {
        if (action === "upload-step") return reply({ success: true, publication });
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=status,processingDetails&id=${encodeURIComponent(publication.youtube_video_id)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await youtubeJson(response);
        const video = data.items?.[0];
        if (!video) throw new Error("Vídeo não encontrado no canal YouTube.");
        const uploadStatus = video.status?.uploadStatus;
        const processing = video.processingDetails?.processingStatus;
        const failed = ["failed", "rejected", "deleted"].includes(uploadStatus) || processing === "failed";
        const completed = uploadStatus === "processed" || processing === "succeeded";
        const status = failed ? "FAILED" : completed ? "PUBLISHED" : "PUBLISHING";
        const reason = failed ? String(video.status?.failureReason || video.status?.rejectionReason ||
          video.processingDetails?.processingFailureReason || "Falha no processamento do YouTube.") : null;
        await admin.from("criafy_publications").update({
          status, youtube_failure_reason: reason,
          published_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("id", publication.id).eq("company_id", companyId);
        return reply({ success: true, publication: { ...publication, status, youtube_failure_reason: reason } });
      }
      if (action === "status") return reply({ success: true, publication });

      const { data: session } = await admin.from("criafy_youtube_upload_sessions")
        .select("upload_url,next_byte,total_size,mime_type")
        .eq("publication_id", publication.id).eq("company_id", companyId).single();
      if (!session) throw new Error("Sessão de upload não encontrada. Contate o suporte antes de reenviar.");
      const uploadUrl = new URL(session.upload_url);
      if (uploadUrl.origin !== "https://www.googleapis.com" ||
          uploadUrl.pathname !== "/upload/youtube/v3/videos") throw new Error("Sessão de upload inválida.");

      // Probe Google first: a previous request may have completed even if our response was lost.
      const probe = await fetch(uploadUrl, {
        method: "PUT",
        redirect: "manual",
        headers: { Authorization: `Bearer ${token}`, "Content-Length": "0",
          "Content-Range": `bytes */${session.total_size}` },
      });
      if (probe.ok && probe.status !== 308) {
        const video = await youtubeJson(probe);
        if (!video.id) throw new Error("YouTube confirmou upload sem ID do vídeo.");
        const { error: saveError } = await admin.from("criafy_publications").update({
          youtube_video_id: video.id, youtube_uploaded_bytes: session.total_size,
          updated_at: new Date().toISOString(),
        }).eq("id", publication.id);
        if (saveError) throw new Error("Upload concluído, mas o ID do vídeo não foi salvo. Tente continuar antes de reenviar.");
        await admin.from("criafy_youtube_upload_sessions").delete().eq("publication_id", publication.id);
        return reply({ success: true, publication: { ...publication, youtube_video_id: video.id,
          youtube_uploaded_bytes: session.total_size } });
      }
      if (probe.status !== 308) await youtubeJson(probe);
      const currentUploadUrl = probe.headers.get("Location") ? uploadLocation(probe) : uploadUrl.toString();
      const range = probe.headers.get("Range");
      const start = range ? Number(range.match(/bytes=0-(\d+)/)?.[1]) + 1 : 0;
      if (!Number.isSafeInteger(start) || start < 0 || start >= session.total_size) {
        throw new Error("Posição de upload inválida. Tente continuar novamente.");
      }
      const end = Math.min(start + CHUNK_SIZE, session.total_size) - 1;
      const { data: content } = await admin.from("criafy_contents")
        .select("media_url").eq("id", publication.content_id).eq("company_id", companyId).single();
      if (!content) throw new Error("Vídeo original não encontrado.");
      const source = await fetch(safeMediaUrl(content.media_url, companyId), {
        headers: { Range: `bytes=${start}-${end}` },
      });
      if (source.status !== 206) throw new Error("O armazenamento não respondeu ao trecho solicitado do vídeo.");
      if (!source.headers.get("Content-Range")?.startsWith(`bytes ${start}-${end}/`)) {
        throw new Error("O armazenamento retornou outro trecho do vídeo. Tente continuar novamente.");
      }
      const bytes = new Uint8Array(await source.arrayBuffer());
      if (bytes.byteLength !== end - start + 1) throw new Error("Trecho do vídeo incompleto. Tente continuar novamente.");
      const uploaded = await fetch(currentUploadUrl, {
        method: "PUT",
        redirect: "manual",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": session.mime_type,
          "Content-Range": `bytes ${start}-${end}/${session.total_size}` },
        body: bytes,
      });
      if (uploaded.status === 308) {
        const acknowledged = uploaded.headers.get("Range")?.match(/bytes=0-(\d+)/)?.[1];
        const nextByte = acknowledged ? Number(acknowledged) + 1 : 0;
        await admin.from("criafy_youtube_upload_sessions")
          .update({ next_byte: nextByte,
            upload_url: uploaded.headers.get("Location") ? uploadLocation(uploaded) : currentUploadUrl,
            updated_at: new Date().toISOString() })
          .eq("publication_id", publication.id).eq("company_id", companyId);
        await admin.from("criafy_publications").update({ youtube_uploaded_bytes: nextByte })
          .eq("id", publication.id).eq("company_id", companyId);
        return reply({ success: true, publication: { ...publication, youtube_uploaded_bytes: nextByte },
          totalSize: session.total_size });
      }
      const video = await youtubeJson(uploaded);
      if (!video.id) throw new Error("YouTube não retornou o ID do vídeo enviado.");
      const { error: saveError } = await admin.from("criafy_publications").update({
        youtube_video_id: video.id, youtube_uploaded_bytes: session.total_size,
        updated_at: new Date().toISOString(),
      }).eq("id", publication.id).eq("company_id", companyId);
      if (saveError) throw new Error("Upload concluído, mas o ID do vídeo não foi salvo. Tente continuar antes de reenviar.");
      await admin.from("criafy_youtube_upload_sessions").delete().eq("publication_id", publication.id);
      return reply({ success: true, publication: { ...publication, youtube_video_id: video.id,
        youtube_uploaded_bytes: session.total_size }, totalSize: session.total_size });
    }

    if (action !== "start" || !contentId || !options || !requestId) {
      return reply({ error: "Solicitação de Short incompleta." }, 400);
    }
    const { data: previous } = await admin.from("criafy_publications")
      .select("id,status,youtube_video_id,youtube_uploaded_bytes")
      .eq("company_id", companyId).eq("youtube_request_id", requestId).maybeSingle();
    if (previous) return reply({ success: true, publication: previous });
    const { data: content } = await admin.from("criafy_contents")
      .select("id,media_url,media_type,duration_seconds,width,height,file_size_bytes,mime_type")
      .eq("id", contentId).eq("company_id", companyId).eq("status", "ACTIVE").single();
    if (!content) return reply({ error: "Vídeo não encontrado neste workspace." }, 404);
    validateShort(options, content);
    safeMediaUrl(content.media_url, companyId);
    const { data: publication, error: insertError } = await admin.from("criafy_publications")
      .insert({
        company_id: companyId, account_id: null, social_account_id: accountId,
        content_id: content.id, publication_type: "YOUTUBE_SHORT",
        caption: options.title.trim(), status: "PUBLISHING",
        youtube_request_id: requestId, youtube_options: {
          title: options.title.trim(), description: options.description.trim(),
          privacy: options.privacy, madeForKids: options.madeForKids,
          containsSyntheticMedia: options.containsSyntheticMedia,
          consented_at: new Date().toISOString(),
        }, created_by: user.id,
      }).select("id,status,youtube_video_id,youtube_uploaded_bytes").single();
    if (insertError || !publication) throw new Error(insertError?.message || "Falha ao registrar Short.");
    const init = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(content.file_size_bytes),
          "X-Upload-Content-Type": content.mime_type },
        body: JSON.stringify({
          snippet: { title: options.title.trim(), description: options.description.trim(), categoryId: "22" },
          status: { privacyStatus: options.privacy,
            selfDeclaredMadeForKids: options.madeForKids,
            containsSyntheticMedia: options.containsSyntheticMedia },
        }),
      },
    );
    if (!init.ok) {
      try { await youtubeJson(init); } catch (error) {
        await admin.from("criafy_publications").update({ status: "FAILED",
          youtube_failure_reason: error instanceof Error ? error.message : "Falha ao iniciar upload." })
          .eq("id", publication.id);
        throw error;
      }
    }
    try {
      const { error: sessionError } = await admin.from("criafy_youtube_upload_sessions")
        .insert({ publication_id: publication.id, company_id: companyId,
          upload_url: uploadLocation(init), total_size: content.file_size_bytes,
          mime_type: content.mime_type });
      if (sessionError) throw sessionError;
    } catch {
      await admin.from("criafy_publications").update({ status: "FAILED",
        youtube_failure_reason: "Sessão de upload não pôde ser salva. Inicie uma nova tentativa." })
        .eq("id", publication.id);
      throw new Error("Sessão criada no YouTube, mas não foi salva. Inicie uma nova tentativa.");
    }
    return reply({ success: true, publication, totalSize: content.file_size_bytes });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Falha ao publicar Short." }, 400);
  }
});
