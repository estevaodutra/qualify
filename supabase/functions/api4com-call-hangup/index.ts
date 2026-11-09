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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { data: { user } } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } };
    if (!user) return new Response(JSON.stringify({ success: false, error: "Sessão inválida." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { operator_id, external_call_id, call_log_id } = await req.json();

    if (!operator_id) {
      return new Response(
        JSON.stringify({ success: false, error: "operator_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: operator } = await supabase
      .from("call_operators")
      .select("id, api4com_token")
      .eq("id", operator_id)
      .eq("user_id", user.id)
      .single();

    if (!operator?.api4com_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Operador ou token não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (external_call_id) {
      try {
        await fetch(`https://api.api4com.com/api/v1/calls/${external_call_id}/hangup`, {
          method: "POST",
          headers: {
            Authorization: operator.api4com_token,
          },
        });
      } catch (e) {
        console.warn("Aviso ao enviar hangup para API4COM:", e);
      }
    }

    // Atualizar log e operador
    if (call_log_id) {
      await supabase
        .from("call_logs")
        .update({
          call_status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", call_log_id)
        .eq("operator_id", operator_id)
        .in("call_status", ["dialing", "ringing", "in_progress"]);
    }

    await supabase
      .from("call_operators")
      .update({
        current_call_id: null,
        status: "available",
        last_call_ended_at: new Date().toISOString(),
      })
      .eq("id", operator_id);

    return new Response(
      JSON.stringify({ success: true, message: "Chamada encerrada com sucesso." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[api4com-call-hangup] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro ao desligar chamada" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
