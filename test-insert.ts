import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supabaseUrl = "https://qualify.6ksfuf.easypanel.host";
const supabaseServiceKey = "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJpc3MiOiAic3VwYWJhc2UiLCAiaWF0IjogMTc0OTI5NjAwMCwgImV4cCI6IDQ5MDQ5Njk2MDB9.oOJGfhukDhCdORGCQX01RLNCR1mb4FJUkOgtF3sp5o0";
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const convId = "224377b0-1d27-410c-9a6d-26eb911ee924"; // Estevão 2981 from screenshot? No, the screenshot shows "Estevão" lead.
  
  // Let's find Estevão's lead first
  const { data: lead } = await adminClient.from("leads").select("*").ilike("name", "Estev%").limit(1).single();
  console.log("Lead:", lead);
  
  if (!lead) return;
  
  // find conv
  const { data: conv } = await adminClient.from("chat_conversations").select("*").eq("lead_id", lead.id).limit(1).single();
  console.log("Conv:", conv);
  if (!conv) return;

  const { data: user } = await adminClient.from("profiles").select("*").limit(1).single();
  
  const conversationId = conv.id;
  const body = "oi";
  const mediaUrl = null;
  const mediaType = null;
  
  console.log("Inserting into message_queue...");
  const { data: queueItem, error: queueErr } = await adminClient
      .from("message_queue")
      .insert({
        company_id: conv.company_id,
        instance_id: conv.instance_id,
        phone: lead.phone,
        message_type: mediaUrl ? (mediaType || "image") : "text",
        body,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        source_type: "chat",
        conversation_id: conversationId,
        lead_id: lead.id,
        priority: 100, // Chat priority
        status: "pending",
      })
      .select("id")
      .single();

    if (queueErr) {
      console.error("Queue Error:", queueErr);
    } else {
        console.log("Queue Item:", queueItem);
    }

    console.log("Inserting into chat_messages...");
    const { data: outboundMsg, error: outErr } = await adminClient
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "operator",
        sender_id: user.id,
        message_type: mediaUrl ? (mediaType || "image") : "text",
        body,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        is_internal: false,
        status: "pending",
      })
      .select()
      .single();

    if (outErr) {
      console.error("OutErr:", outErr);
    } else {
        console.log("Out Msg:", outboundMsg);
    }
}

run();
