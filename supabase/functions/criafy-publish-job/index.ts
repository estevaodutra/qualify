import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Função utilitária para aguardar processamento de container de vídeo da Meta
 */
async function waitForContainerReady(
  creationId: string,
  accessToken: string,
  maxAttempts = 15,
  intervalMs = 3000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${accessToken}`
    );
    const data = await res.json();

    if (data.status_code === "FINISHED") {
      return;
    }

    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`Processamento de vídeo falhou na Meta com status: ${data.status_code}`);
    }
  }

  throw new Error("Timeout ao aguardar processamento do vídeo pela Meta Graph API.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { publicationId } = body;

    if (!publicationId) {
      throw new Error("publicationId is required");
    }

    // 1. Buscar a publicação com conta e conteúdo
    const { data: pub, error: pubError } = await adminClient
      .from("criafy_publications")
      .select(`
        *,
        account:criafy_instagram_accounts(*),
        content:criafy_contents(*)
      `)
      .eq("id", publicationId)
      .single();

    if (pubError || !pub) {
      throw new Error(`Publicação não encontrada: ${pubError?.message}`);
    }

    const account = pub.account;
    const content = pub.content;

    if (!account) throw new Error("Conta do Instagram não encontrada para esta publicação");
    if (!content) throw new Error("Mídia de conteúdo não encontrada para esta publicação");

    const accessToken = account.access_token;
    const igUserId = account.instagram_account_id;

    if (!accessToken || !igUserId) {
      throw new Error(
        `Conta @${account.username} não possui Access Token ou ID Meta válido. Reconecte a conta.`
      );
    }

    // Atualizar status para PUBLISHING
    await adminClient
      .from("criafy_publications")
      .update({ status: "PUBLISHING", updated_at: new Date().toISOString() })
      .eq("id", publicationId);

    let containerId: string | null = null;
    const isVideo = content.media_type === "VIDEO";
    const mediaUrl = content.media_url;
    const caption = pub.caption || "";

    // 2. Criar Container na Meta Graph API conforme o tipo de publicação
    if (pub.publication_type === "REEL") {
      const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
      const params = new URLSearchParams({
        media_type: "REELS",
        video_url: mediaUrl,
        caption,
        share_to_feed: "true",
        access_token: accessToken,
      });

      const res = await fetch(`${containerUrl}?${params.toString()}`, { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(`Meta Reels Container Error: ${data.error.message}`);
      containerId = data.id;

      // Aguardar processamento do vídeo
      await waitForContainerReady(containerId!, accessToken);
    } else if (pub.publication_type === "FEED") {
      const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
      const params = new URLSearchParams({
        caption,
        access_token: accessToken,
      });

      if (isVideo) {
        params.set("media_type", "VIDEO");
        params.set("video_url", mediaUrl);
      } else {
        params.set("image_url", mediaUrl);
      }

      const res = await fetch(`${containerUrl}?${params.toString()}`, { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(`Meta Feed Container Error: ${data.error.message}`);
      containerId = data.id;

      if (isVideo) {
        await waitForContainerReady(containerId!, accessToken);
      }
    } else if (pub.publication_type === "STORY_VIDEO") {
      const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
      const params = new URLSearchParams({
        media_type: "STORIES",
        video_url: mediaUrl,
        access_token: accessToken,
      });

      const res = await fetch(`${containerUrl}?${params.toString()}`, { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(`Meta Story Video Error: ${data.error.message}`);
      containerId = data.id;

      await waitForContainerReady(containerId!, accessToken);
    } else if (pub.publication_type === "STORY_IMAGE") {
      const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
      const params = new URLSearchParams({
        media_type: "STORIES",
        image_url: mediaUrl,
        access_token: accessToken,
      });

      const res = await fetch(`${containerUrl}?${params.toString()}`, { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(`Meta Story Image Error: ${data.error.message}`);
      containerId = data.id;
    }

    if (!containerId) {
      throw new Error("Não foi possível gerar o container de mídia na Meta.");
    }

    // 3. Publicar efetivamente o container
    const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;
    const publishRes = await fetch(
      `${publishUrl}?creation_id=${containerId}&access_token=${accessToken}`,
      { method: "POST" }
    );
    const publishData = await publishRes.json();

    if (publishData.error) {
      throw new Error(`Meta Publish Error: ${publishData.error.message}`);
    }

    const igMediaId = publishData.id;

    // 4. Buscar permalink público se disponível
    let igPermalink = null;
    try {
      const permalinkRes = await fetch(
        `https://graph.facebook.com/v19.0/${igMediaId}?fields=permalink&access_token=${accessToken}`
      );
      const permalinkData = await permalinkRes.json();
      igPermalink = permalinkData.permalink || null;
    } catch (_) {
      // Ignora erro opcional de permalink
    }

    // 5. Atualizar publicação para PUBLISHED
    await adminClient
      .from("criafy_publications")
      .update({
        status: "PUBLISHED",
        published_at: new Date().toISOString(),
        ig_media_id: igMediaId,
        ig_permalink: igPermalink,
        updated_at: new Date().toISOString(),
      })
      .eq("id", publicationId);

    // 6. Registrar tentativa bem-sucedida (sanitizada)
    await adminClient.from("criafy_publication_attempts").insert({
      company_id: pub.company_id,
      publication_id: publicationId,
      attempt_number: 1,
      status: "SUCCESS",
      raw_response_sanitized: {
        ig_media_id: igMediaId,
        permalink: igPermalink,
        status_code: 200,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        igMediaId,
        igPermalink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    // Log de erro sanitizado na publicação
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      const body = await req.clone().json();
      if (body.publicationId) {
        await adminClient
          .from("criafy_publications")
          .update({ status: "FAILED", updated_at: new Date().toISOString() })
          .eq("id", body.publicationId);

        await adminClient.from("criafy_publication_attempts").insert({
          company_id: body.companyId || "00000000-0000-0000-0000-000000000000",
          publication_id: body.publicationId,
          attempt_number: 1,
          status: "FAILED",
          error_message: err.message,
          raw_response_sanitized: { error: err.message },
        });
      }
    } catch (_) {}

    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
