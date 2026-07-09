import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_EVENT_TYPES = [
  "text_message",
  "image_message",
  "video_message",
  "audio_message",
  "document_message",
  "sticker_message",
  "location_message",
  "contact_message",
  "message_status",
  "message_reaction",
  "message_revoked",
  "button_response",
  "list_response",
  "poll_message",
  "poll_response",
  "reaction",
  "group_join",
  "group_leave",
  "group_promote",
  "group_demote",
  "group_update",
  "connection_status",
  "qrcode_update",
  "chat_presence",
  "call_received"
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { webhook_event_id, source, event_subtype, raw_event, user_id } = body;

    if (!source || !event_subtype || !raw_event) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.warn("[auto-classify] GEMINI_API_KEY not found. Skipping auto-classification.");
      return new Response(JSON.stringify({ error: "No AI provider configured" }), { status: 500, headers: corsHeaders });
    }

    console.log(`[auto-classify] Analyzing unknown event: ${event_subtype} from ${source}`);

    // Call Gemini API via fetch to avoid ESM issues
    const prompt = `You are an expert in WhatsApp API webhooks (WAHA, Z-API).
A new unknown webhook event was received.
Source Provider: ${source}
Event Subtype / Name: ${event_subtype}
Raw JSON Payload:
${JSON.stringify(raw_event, null, 2)}

Your task is to classify this event into one of the following exact types:
${VALID_EVENT_TYPES.join(", ")}

Respond ONLY with a valid JSON object containing:
- "mapped_type": The exact string from the valid types list that best matches this event.
- "confidence": "high", "medium", or "low".
- "reasoning": A brief 1-sentence explanation of why.
`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[auto-classify] Gemini API error:", errText);
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      throw new Error("Empty response from AI");
    }

    const aiResult = JSON.parse(resultText);
    const mappedType = aiResult.mapped_type;

    if (!VALID_EVENT_TYPES.includes(mappedType)) {
      throw new Error(`AI returned invalid type: ${mappedType}`);
    }

    console.log(`[auto-classify] AI classified as ${mappedType} (Confidence: ${aiResult.confidence})`);

    // 1. Insert into dynamic_event_mappings
    const { error: mappingError } = await supabase
      .from("dynamic_event_mappings")
      .upsert({
        source,
        event_subtype,
        mapped_type: mappedType,
        is_ai_generated: true,
        status: "active"
      }, { onConflict: "source,event_subtype" });

    if (mappingError) {
      console.error("[auto-classify] Error inserting mapping:", mappingError);
    }

    // 2. Retroactively update webhook_events
    const { error: updateError } = await supabase
      .from("webhook_events")
      .update({
        event_type: mappedType,
        classification: "identified",
        matched_rule: "ai_auto_correction"
      })
      .eq("source", source)
      .eq("event_subtype", event_subtype)
      .eq("classification", "pending");

    if (updateError) {
      console.error("[auto-classify] Error updating previous events:", updateError);
    }

    // 3. Create a success alert for the admin
    if (user_id) {
      await supabase
        .from("alerts")
        .insert({
          user_id,
          severity: "info",
          title: "Novo Evento Mapeado pela IA",
          description: `A IA identificou o evento desconhecido '${event_subtype}' como '${mappedType}'. Regra salva e aplicada aos eventos anteriores.`,
          entity: "webhook",
          read: false
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      mapped_type: mappedType,
      reasoning: aiResult.reasoning 
    }), { headers: corsHeaders });

  } catch (error) {
    console.error("[auto-classify] Unhandled error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
