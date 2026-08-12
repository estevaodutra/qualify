import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface N8nFormattedPayload {
  instance_id: string;
  source: string;
  type: string;
  direction: "inbound" | "outbound";
  chat_jid: string;
  sender_phone: string;
  sender_name?: string;
  message_id?: string;
  timestamp?: string;
  content: {
    text?: string;
    media_url?: string;
    mime_type?: string;
    file_name?: string;
    [key: string]: any;
  };
  raw_n8n_event?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: N8nFormattedPayload = await req.json();

    // 1. Validar campos mínimos
    if (!payload.instance_id || !payload.type || !payload.sender_phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: instance_id, type, or sender_phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[n8n-inbound] Recebido evento formatado. Tipo: ${payload.type}, Instância: ${payload.instance_id}`);

    // 2. Localizar a instância (tentando primeiro pelo external_instance_id, depois pelo ID interno se não achar)
    let { data: instance } = await supabase
      .from("instances")
      .select("id, user_id, name")
      .eq("external_instance_id", payload.instance_id)
      .maybeSingle();

    if (!instance) {
        // Fallback: tentar pelo id nativo
        const { data: fallbackInstance } = await supabase
            .from("instances")
            .select("id, user_id, name")
            .eq("id", payload.instance_id)
            .maybeSingle();
        
        if (fallbackInstance) {
            instance = fallbackInstance;
        }
    }

    if (!instance) {
      console.warn(`[n8n-inbound] Instância não encontrada para id="${payload.instance_id}". Salvando sem vínculo de usuário.`);
    }

    // 3. Montar o objeto bruto para salvar como log de raw_event
    const rawEvent = payload.raw_n8n_event || payload;

    // 4. Inserir direto na tabela webhook_events, mas BURLANDO a classificação complexa
    const { data: insertedEvent, error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        user_id: instance?.user_id || null,
        source: payload.source || "n8n",
        external_instance_id: payload.instance_id, // Pode ser o interno ou externo
        instance_id: instance?.id || null,
        event_type: "message",                     // O sistema principal espera 'message'
        event_subtype: payload.type,               // Aqui vai o 'text', 'image', 'audio', etc
        classification: "identified",              // Bypassa as IA e regras
        direction: payload.direction || "inbound",
        confidence: "high",
        matched_rule: "n8n_formatted_webhook",
        chat_jid: payload.chat_jid || `${payload.sender_phone}@s.whatsapp.net`,
        chat_type: "individual", // Ou poderia vir do n8n se for grupo
        chat_name: payload.sender_name || payload.sender_phone,
        sender_phone: payload.sender_phone,
        sender_name: payload.sender_name || payload.sender_phone,
        message_id: payload.message_id || `n8n_${Date.now()}`,
        raw_event: rawEvent,
        event_timestamp: payload.timestamp || new Date().toISOString(),
        received_at: new Date().toISOString(),
        processing_status: "pending",              // Vai para a fila de processamento (queue-worker / chat)
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[n8n-inbound] Erro ao inserir evento:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[n8n-inbound] Evento salvo com sucesso. ID: ${insertedEvent.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Evento registrado com sucesso e pronto para processamento", id: insertedEvent.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[n8n-inbound] Erro catastrófico:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
