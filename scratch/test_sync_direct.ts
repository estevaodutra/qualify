import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const syncSentMessageToChat = async (
  supabase: any,
  params: {
    companyId?: string;
    instanceId?: string;
    phone?: string;
    name?: string;
    leadId?: string | null;
    body?: string;
    externalMessageId?: string | null;
  }
) => {
  console.log("Calling syncSentMessageToChat with params:", params);
  if (!params.phone || !params.companyId || !params.body) {
    console.log("Missing required params for syncSentMessageToChat:", { phone: params.phone, companyId: params.companyId, body: params.body });
    return;
  }
  const cleanPhone = params.phone.replace(/\D/g, "");
  if (!cleanPhone) return;

  try {
    let convId: string | null = null;

    if (params.leadId) {
      const { data, error: err1 } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("company_id", params.companyId)
        .eq("lead_id", params.leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      console.log("Lookup by leadId:", data, err1);
      if (data) convId = data.id;
    }

    if (!convId) {
      const { data, error: err2 } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("company_id", params.companyId)
        .eq("contact_phone", cleanPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      console.log("Lookup by contact_phone:", data, err2);
      if (data) convId = data.id;
    }

    if (!convId) {
      const { data: newConv, error: err3 } = await supabase
        .from("chat_conversations")
        .insert({
          company_id: params.companyId,
          instance_id: params.instanceId || null,
          lead_id: params.leadId || null,
          contact_phone: cleanPhone,
          contact_name: params.name || cleanPhone,
          status: "open",
          last_message_at: new Date().toISOString(),
          last_message_preview: params.body,
        })
        .select("id")
        .single();
      console.log("New conversation created:", newConv, err3);
      if (newConv) convId = newConv.id;
    }

    if (convId) {
      const { data: newMsg, error: msgErr } = await supabase.from("chat_messages").insert({
        company_id: params.companyId,
        conversation_id: convId,
        sender_type: "operator",
        message_type: "text",
        body: params.body,
        status: "sent",
        message_id: params.externalMessageId || null,
        created_at: new Date().toISOString(),
      }).select();

      console.log("Inserted message into chat_messages:", newMsg, msgErr);

      const { data: updatedConv, error: updateErr } = await supabase
        .from("chat_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: params.body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", convId)
        .select();

      console.log("Updated chat_conversations:", updatedConv, updateErr);
    }
  } catch (err) {
    console.error("Error in syncSentMessageToChat:", err);
  }
};

async function main() {
  await syncSentMessageToChat(supabase, {
    companyId: "dcb34e9a-1510-4137-aecd-cec0c6d548c4",
    instanceId: "ab93f07e-a236-4486-9430-a115d01c0ffc",
    phone: "5512982402981",
    name: "Estevão",
    leadId: "99b5072f-1f7b-44c5-b4a0-d061ed7f107f",
    body: "Lead não tem negócio (Teste de Envio)",
  });
}

main().catch(console.error);
