const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // 1. Handshake de Verificação da Meta (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const expectedToken =
      Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "criafy_meta_webhook_2026";

    if (mode === "subscribe" && token === expectedToken) {
      console.log("[Criafy Webhook] Handshake verificado com sucesso pela Meta.");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.warn("[Criafy Webhook] Falha na verificação do token:", { mode, token });
    return new Response("Forbidden: Invalid verify token", { status: 403 });
  }

  // 2. Recebimento de Notificações de Eventos da Meta (POST)
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      console.log("[Criafy Webhook] Evento recebido da Meta:", JSON.stringify(payload));

      // Resposta imediata 200 OK exigida pela Meta para evitar timeouts
      return new Response(JSON.stringify({ success: true, received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("[Criafy Webhook] Erro ao processar payload:", err.message);
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});
