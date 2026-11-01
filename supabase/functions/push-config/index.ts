const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve((request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  if (!publicKey) {
    return Response.json({ error: "Push não configurado" }, { status: 503, headers: corsHeaders });
  }
  return Response.json({ publicKey }, { headers: corsHeaders });
});
