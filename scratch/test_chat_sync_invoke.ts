import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const supabaseUrl = process.env.SUPABASE_URL!;

async function main() {
  const url = `${supabaseUrl}/functions/v1/execute-message`;

  const body = {
    campaignId: "5dadf41d-b66f-4471-8864-8657fbd24e9c",
    sequenceId: "9e07eb1a-ec0c-4db3-b03f-630ae635e716",
    triggerContext: {
      leadId: "99b5072f-1f7b-44c5-b4a0-d061ed7f107f",
      companyId: "dcb34e9a-1510-4137-aecd-cec0c6d548c4",
      sendPrivate: true,
      respondentJid: "5512982402981@s.whatsapp.net",
      respondentName: "Estevão",
      respondentPhone: "5512982402981"
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(body)
  });

  console.log("Execute response:", res.status, await res.text());

  // Check chat_messages for conversation 29a7e4c8-375b-445f-8094-63986afa56f3
  const { data: msgs } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", "29a7e4c8-375b-445f-8094-63986afa56f3")
    .order("created_at", { ascending: false });

  console.log("Chat messages after execution:", JSON.stringify(msgs, null, 2));
}

main().catch(console.error);
