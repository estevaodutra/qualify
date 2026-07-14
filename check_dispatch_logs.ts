import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  console.log("=== LATEST GROUP MESSAGE LOGS ===");
  const { data: logs, error: logsError } = await supabase
    .from("group_message_logs")
    .select("id, group_name, group_jid, status, error_message, node_type, payload")
    .order("id", { ascending: false })
    .limit(10);

  if (logsError) {
    console.error("Error fetching group message logs:", logsError);
  } else {
    for (const log of logs || []) {
      console.log(`[ID: ${log.id}] Group: ${log.group_name} (${log.group_jid}) | Status: ${log.status} | Node: ${log.node_type}`);
      if (log.error_message) {
        console.log(`  ❌ Error: ${log.error_message}`);
      }
      if (log.payload) {
        console.log(`  Payload Action: ${log.payload.action}`);
      }
    }
  }

  console.log("\n=== INSTANCES STATUS ===");
  const { data: insts, error: instsError } = await supabase
    .from("instances")
    .select("id, name, phone, status, provider, external_instance_id");

  if (instsError) {
    console.error("Error fetching instances:", instsError);
  } else {
    for (const inst of insts || []) {
      console.log(`- ${inst.name} (${inst.phone}) | Status: ${inst.status} | Provider: ${inst.provider} | External ID: ${inst.external_instance_id}`);
    }
  }
}

main().catch(console.error);
