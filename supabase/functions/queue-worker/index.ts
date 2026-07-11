import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendWhatsAppMessage, StandardizedPayload } from "../_shared/whatsapp-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Call an RPC function that does the SELECT FOR UPDATE SKIP LOCKED
    // and returns the instances ready to process along with their next message
    const { data: queueItems, error: rpcError } = await adminClient.rpc('process_message_queue_batch');

    if (rpcError) {
      console.error("Error fetching queue batch:", rpcError);
      return new Response(JSON.stringify({ error: rpcError.message }), { status: 500, headers: corsHeaders });
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Fila vazia" }), { headers: corsHeaders });
    }

    const results = [];

    for (const item of queueItems) {
      try {
        // Fetch instance details
        const { data: inst, error: instErr } = await adminClient
          .from("instances")
          .select("id, name, phone, provider, external_instance_id, external_instance_token")
          .eq("id", item.instance_id)
          .single();

        if (instErr || !inst?.external_instance_id || !inst?.external_instance_token) {
          throw new Error("Instance configuration or credentials not found");
        }

        // Prepare payload for Z-API
        const payload: StandardizedPayload = {
          phone: item.phone,
          messageType: (item.message_type as any) || "text",
          body: item.body,
          mediaUrl: item.media_url,
          mediaType: item.media_type,
        };

        // Enviar a mensagem para a Z-API
        const waResult = await sendWhatsAppMessage(
          inst.provider,
          inst.external_instance_id,
          inst.external_instance_token,
          payload
        );

        if (!waResult.success) {
          throw new Error(`Provider Error: ${waResult.error}`);
        }

        // Criar o registro na tabela chat_messages se for do chat
        if (item.source_type === 'chat' && item.conversation_id) {
            const { data: dbMsg, error: dbErr } = await adminClient
            .from("chat_messages")
            .insert({
                conversation_id: item.conversation_id,
                sender_type: "operator",
                message_type: item.message_type,
                body: item.body,
                media_url: item.media_url,
                media_type: item.media_type,
                is_internal: false,
                status: "sent",
                message_id: waResult.messageId || null,
            })
            .select()
            .single();

            if (!dbErr && dbMsg) {
                // Atualizar o preview da conversa
                await adminClient
                .from("chat_conversations")
                .update({
                    last_message_preview: dbMsg.body || "[Mídia]",
                    last_message_at: dbMsg.created_at,
                    updated_at: dbMsg.created_at,
                })
                .eq("id", item.conversation_id);
            }
        }

        // Atualizar status na fila
        await adminClient
          .from("message_queue")
          .update({
            status: 'sent',
            processed_at: new Date().toISOString(),
            attempts: item.attempts + 1
          })
          .eq("id", item.queue_id);

        results.push({ id: item.queue_id, status: 'sent' });

      } catch (err: any) {
        console.error(`Failed to process queue item ${item.queue_id}:`, err);
        
        const newAttempts = item.attempts + 1;
        const newStatus = newAttempts >= item.max_attempts ? 'failed' : 'pending';

        // Atualizar a fila com erro
        await adminClient
          .from("message_queue")
          .update({
            status: newStatus,
            error_message: err.message || 'Unknown error',
            attempts: newAttempts,
            scheduled_at: newStatus === 'pending' ? new Date(Date.now() + 60000).toISOString() : item.scheduled_at // Retry em 1 minuto
          })
          .eq("id", item.queue_id);

        results.push({ id: item.queue_id, status: newStatus, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Queue Worker Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
