import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  // Fetch payload of node 4 from group_message_logs or build standard payload
  const { data: instance } = await supabase
    .from('instances')
    .select('*')
    .eq('id', 'ab93f07e-a236-4486-9430-a115d01c0ffc')
    .single();

  console.log("Instance details:", instance);

  const payload = {
    action: "message.send_text",
    node: {
      id: "twiko4p",
      type: "message",
      order: 3,
      config: {
        text: "Lead não tem negócio"
      }
    },
    campaign: {
      id: "9e07eb1a-ec0c-4db3-b03f-630ae635e716",
      name: "teste"
    },
    instance: {
      id: instance.id,
      name: instance.name,
      phone: instance.phone || "",
      provider: instance.provider,
      externalId: instance.external_instance_id || instance.id || "",
      externalToken: instance.external_instance_token || "",
    },
    destination: {
      jid: "5512982402981@s.whatsapp.net",
      phone: "5512982402981@s.whatsapp.net",
      name: "Estevão"
    }
  };

  console.log("Constructed payload:", JSON.stringify(payload, null, 2));

  // Test calling n8n router / whatsapp client endpoint
  const routerUrl = "https://n8n.d2x.site/webhook/manager_messages";
  const n8nPayload = {
    provider: (instance.provider || "").toLowerCase(),
    instance_id: instance.external_instance_id || instance.id,
    instance_token: instance.external_instance_token || "",
    internal_db_id: instance.id,
    instance_name: instance.name || "",
    api_key: "",
    action: "message.send_text",
    content: {
      phone: "5512982402981",
      message: "Lead não tem negócio"
    }
  };

  console.log("Calling n8n manager_messages with:", JSON.stringify(n8nPayload, null, 2));

  const res = await fetch(routerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(n8nPayload)
  });

  const resText = await res.text();
  console.log("Response HTTP status:", res.status);
  console.log("Response text:", resText);
}

main().catch(console.error);
