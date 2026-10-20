import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API_VERSION = "v21.0";

/**
 * Função utilitária para aguardar processamento de container de vídeo da Meta
 */
async function waitForContainerReady(
  creationId: string,
  accessToken: string,
  maxAttempts = 70,
  intervalMs = 3000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${creationId}?fields=status_code,status&access_token=${accessToken}`
    );
    const data = await res.json();

    if (data.error) {
      throw new Error(`Erro ao verificar status do container na Meta: ${data.error.message}`);
    }

    if (data.status_code === "FINISHED") {
      // Buffer curto para propagação de mídia nas bordas CDN da Meta antes de chamar media_publish
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return;
    }

    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      const detail = data.status || `Status: ${data.status_code}`;
      let extraHint = "";
      if (String(detail).includes("2207082")) {
        extraHint = " — Dica: Em Stories do Instagram, a Meta rejeita vídeos com mais de 60 segundos ou fora de 9:16 (use Reel para vídeos mais longos).";
      }
      throw new Error(`Processamento de vídeo falhou na Meta: ${detail}${extraHint}`);
    }

    // A cada 5 tentativas (~15s), logar no console da função para monitoramento
    if ((i + 1) % 5 === 0) {
      console.log(`[waitForContainerReady] Tentativa ${i + 1}/${maxAttempts} (${(i + 1) * 3}s) - status: ${data.status_code || 'IN_PROGRESS'}`);
    }
  }

  throw new Error("Timeout ao aguardar processamento do vídeo pela Meta Graph API (mais de 3.5 minutos decorridos).");
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let publicationId: string | null = null;
  let pubCompanyId: string | null = null;
  let requestLogPayload: any = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    publicationId = body.publicationId;

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

    pubCompanyId = pub.company_id;
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

    // Montar payload de rastreamento da requisição para auditoria e logs
    requestLogPayload = {
      publication_id: publicationId,
      company_id: pub.company_id,
      publication_type: pub.publication_type,
      caption: pub.caption,
      media_url: content.media_url,
      media_type: content.media_type,
      account_username: account.username,
      instagram_account_id: igUserId,
      width: content.width,
      height: content.height,
      aspect_ratio: content.aspect_ratio,
      duration_seconds: content.duration_seconds,
      api_version: GRAPH_API_VERSION,
    };

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
      const containerUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`;
      const params = new URLSearchParams({
        media_type: "REELS",
        video_url: mediaUrl,
        caption,
        share_to_feed: "true",
        access_token: accessToken,
      });

      const res = await fetch(`${containerUrl}?${params.toString()}`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        const sub = data.error.error_subcode ? ` [Subcode: ${data.error.error_subcode}]` : "";
        throw new Error(`Meta Reels Container Error: ${data.error.message}${sub}`);
      }
      containerId = data.id;

      // Aguardar processamento do vídeo
      await waitForContainerReady(containerId!, accessToken);
    } else if (pub.publication_type === "FEED") {
      const containerUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`;
      const params = new URLSearchParams({
        caption,
        access_token: accessToken,
      });

      if (isVideo) {
        params.set("media_type", "REELS");
        params.set("video_url", mediaUrl);
        params.set("share_to_feed", "true");
      } else {
        params.set("image_url", mediaUrl);
      }

      const res = await fetch(`${containerUrl}?${params.toString()}`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        const sub = data.error.error_subcode ? ` [Subcode: ${data.error.error_subcode}]` : "";
        throw new Error(`Meta Feed Container Error: ${data.error.message}${sub}`);
      }
      containerId = data.id;

      if (isVideo) {
        await waitForContainerReady(containerId!, accessToken);
      }
    } else if (pub.publication_type === "STORY_VIDEO") {
      if (content.duration_seconds && Number(content.duration_seconds) > 60) {
        throw new Error(
          `O Instagram não aceita vídeos de Story com mais de 60 segundos (o vídeo atual possui ${Math.round(Number(content.duration_seconds))}s). Por favor, selecione o formato REEL ou corte o vídeo para até 60 segundos.`
        );
      }

      const containerUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`;
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
      const containerUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media`;
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

    requestLogPayload.container_id = containerId;

    // 3. Publicar efetivamente o container
    const publishUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media_publish`;
    const publishRes = await fetch(
      `${publishUrl}?creation_id=${containerId}&access_token=${accessToken}`,
      { method: "POST" }
    );
    const publishData = await publishRes.json();

    if (publishData.error) {
      const err = publishData.error;
      const errorCode = err.error_subcode || err.code || null;
      const userMsg = err.error_user_msg || err.error_user_title || err.message;

      let diagnosticHint = "";
      if (String(errorCode) === "2207085") {
        diagnosticHint = " (Vídeo incompatível com pipeline da Meta: verifique se o arquivo tem proporção 9:16 e faststart/moov no início)";
      }

      const fullMsg = `Meta Publish Error: ${err.message}${errorCode ? ` (Código: ${errorCode})` : ""}${userMsg && userMsg !== err.message ? ` - ${userMsg}` : ""}${diagnosticHint}`;

      // Gravar log detalhado no banco
      await adminClient.from("criafy_publication_attempts").insert({
        company_id: pub.company_id,
        publication_id: publicationId,
        attempt_number: 1,
        status: "FAILED",
        error_code: errorCode ? String(errorCode) : null,
        error_message: fullMsg,
        raw_response_sanitized: {
          request: requestLogPayload,
          response: publishData,
        },
      });

      throw new Error(fullMsg);
    }

    const igMediaId = publishData.id;

    // 4. Buscar permalink público se disponível
    let igPermalink = null;
    try {
      const permalinkRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${igMediaId}?fields=permalink&access_token=${accessToken}`
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

    // 6. Registrar tentativa bem-sucedida com payload completo e resposta da Meta
    await adminClient.from("criafy_publication_attempts").insert({
      company_id: pub.company_id,
      publication_id: publicationId,
      attempt_number: 1,
      status: "SUCCESS",
      error_code: null,
      error_message: null,
      raw_response_sanitized: {
        request: requestLogPayload,
        response: {
          status_code: 200,
          ig_media_id: igMediaId,
          permalink: igPermalink,
        },
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
    // Log de erro sanitizado na publicação se ainda não registrado
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      if (publicationId) {
        await adminClient
          .from("criafy_publications")
          .update({ status: "FAILED", updated_at: new Date().toISOString() })
          .eq("id", publicationId);

        // Verifica se já gravamos tentativa específica do publishData
        const { data: existingAttempts } = await adminClient
          .from("criafy_publication_attempts")
          .select("id")
          .eq("publication_id", publicationId)
          .order("attempted_at", { ascending: false })
          .limit(1);

        // Se não tiver tentativa gravada nos últimos 10s, grava agora
        if (!existingAttempts || existingAttempts.length === 0) {
          await adminClient.from("criafy_publication_attempts").insert({
            company_id: pubCompanyId || "00000000-0000-0000-0000-000000000000",
            publication_id: publicationId,
            attempt_number: 1,
            status: "FAILED",
            error_code: "INTERNAL_ERROR",
            error_message: err.message,
            raw_response_sanitized: {
              request: requestLogPayload || { publication_id: publicationId },
              response: { error: err.message },
            },
          });
        }
      }
    } catch (logErr) {
      console.error("[criafy-publish-job] Erro ao gravar tentativa com falha:", logErr);
    }

    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
