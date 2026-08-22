import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: logEntry, error } = await supabase
    .from("group_message_logs")
    .insert({
      user_id: "95b89774-fba0-485b-b539-14cb2901befe",
      group_campaign_id: "9e07eb1a-ec0c-4db3-b03f-630ae635e716",
      message_id: null,
      sequence_id: "9e07eb1a-ec0c-4db3-b03f-630ae635e716",
      node_type: "message",
      node_order: 3,
      group_jid: "5512982402981@s.whatsapp.net",
      group_name: "Estevão",
      recipient_phone: "5512982402981",
      instance_id: "ab93f07e-a236-4486-9430-a115d01c0ffc",
      instance_name: "Mauro | Business - Iphone",
      campaign_name: "teste",
      status: "sending",
      payload: { test: true },
    })
    .select()
    .single();

  console.log("logEntry result:", logEntry, error);
}

main().catch(console.error);
