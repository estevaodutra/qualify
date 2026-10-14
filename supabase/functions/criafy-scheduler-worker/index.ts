import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar publicações agendadas prontas para publicação (status = SCHEDULED e scheduled_at <= now)
    const nowIso = new Date().toISOString();
    const { data: pendingPubs, error: fetchErr } = await adminClient
      .from("criafy_publications")
      .select("id, company_id, account_id, scheduled_at")
      .eq("status", "SCHEDULED")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(10); // Lotes de até 10 para segurança

    if (fetchErr) {
      throw new Error(`Erro ao buscar publicações agendadas: ${fetchErr.message}`);
    }

    const totalFound = pendingPubs ? pendingPubs.length : 0;
    let successfulCount = 0;
    let failedCount = 0;

    // 2. Processar cada publicação chamando criafy-publish-job
    for (const pub of pendingPubs || []) {
      try {
        const publishRes = await fetch(`${supabaseUrl}/functions/v1/criafy-publish-job`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ publicationId: pub.id }),
        });

        const pubResult = await publishRes.json();
        if (pubResult.success) {
          successfulCount++;
        } else {
          failedCount++;
          console.error(`Falha na publicação agendada ${pub.id}:`, pubResult.error);
        }
      } catch (itemErr) {
        failedCount++;
        console.error(`Erro inesperado ao publicar agendamento ${pub.id}:`, itemErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: nowIso,
        found: totalFound,
        successful: successfulCount,
        failed: failedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
