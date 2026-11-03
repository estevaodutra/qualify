import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // A documentação da API4COM exige responder 200 OK imediatamente
  // e processar os eventos assincronamente.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Processar em background
  (async () => {
    try {
      const { eventType, id: externalCallId, duration, hangupCause, hangupCauseCode, recordUrl, metadata } = body;
      const callLogId = metadata?.callLogId;
      const operatorId = metadata?.operatorId;

      console.log(`[api4com-webhook] Evento: ${eventType} para chamada ${externalCallId}`);

      if (eventType === "channel-answer") {
        // O destino atendeu a ligação
        const updateData: Record<string, unknown> = {
          call_status: "in_progress",
          external_call_id: externalCallId,
        };
        if (recordUrl) {
          updateData.audio_url = recordUrl;
        }

        if (callLogId) {
          await supabase.from("call_logs").update(updateData).eq("id", callLogId);
        } else if (externalCallId) {
          await supabase.from("call_logs").update(updateData).eq("external_call_id", externalCallId);
        }
      } else if (eventType === "channel-hangup") {
        // Chamada finalizada
        const callDuration = Number(duration) || 0;
        let finalStatus = "completed";

        if (callDuration === 0 || hangupCause === "NO_ANSWER") {
          finalStatus = "no_answer";
        } else if (hangupCause === "BUSY") {
          finalStatus = "busy";
        } else if (hangupCause === "NORMAL_CLEARING" && callDuration > 0) {
          finalStatus = "completed";
        } else if (hangupCause === "REJECTED" || hangupCause === "CALL_REJECTED") {
          finalStatus = "failed";
        }

        const updateData: Record<string, unknown> = {
          call_status: finalStatus,
          duration_seconds: callDuration,
          hangup_cause: hangupCause,
          hangup_cause_code: String(hangupCauseCode || ""),
          ended_at: new Date().toISOString(),
          api4com_metadata: metadata || {},
        };

        if (recordUrl) {
          updateData.audio_url = recordUrl;
        }

        if (callLogId) {
          await supabase.from("call_logs").update(updateData).eq("id", callLogId);
        } else if (externalCallId) {
          await supabase.from("call_logs").update(updateData).eq("external_call_id", externalCallId);
        }

        // Liberar o operador
        if (operatorId) {
          await supabase
            .from("call_operators")
            .update({
              current_call_id: null,
              status: "available",
              last_call_ended_at: new Date().toISOString(),
            })
            .eq("id", operatorId);
        }
      }
    } catch (err) {
      console.error("[api4com-webhook] Erro no processamento assíncrono:", err);
    }
  })();

  return new Response(JSON.stringify({ received: true, event: body.eventType }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
