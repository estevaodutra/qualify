import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const campaignId = 'e3efe5b4-8c2b-462f-8eab-1148f8058c02';
  
  console.log("=== CHECKING CAMPAIGN ===");
  const { data: camp, error: campError } = await supabase
    .from("group_campaigns")
    .select(`
      id,
      name,
      status,
      instance_id,
      config,
      user_id,
      instances(
        id,
        name,
        phone,
        provider,
        status,
        external_instance_id,
        external_instance_token
      )
    `)
    .eq("id", campaignId)
    .maybeSingle();

  if (campError) {
    console.error("Error fetching campaign:", campError);
  } else if (!camp) {
    console.log("Campaign not found!");
  } else {
    console.log("Campaign info:", {
      id: camp.id,
      name: camp.name,
      status: camp.status,
      instance_id: camp.instance_id,
      config: camp.config,
      user_id: camp.user_id,
      instance: camp.instances
    });
  }

  console.log("\n=== CHECKING LINKED GROUPS ===");
  const { data: groups, error: groupsError } = await supabase
    .from("campaign_groups")
    .select("*")
    .eq("campaign_id", campaignId);

  if (groupsError) {
    console.error("Error fetching linked groups:", groupsError);
  } else {
    console.log(`Found ${groups?.length || 0} linked groups:`);
    for (const g of groups || []) {
      console.log(`Group:`, g);
    }
  }

  console.log("\n=== CHECKING MESSAGE LOGS FOR THIS CAMPAIGN ===");
  const { data: logs, error: logsError } = await supabase
    .from("group_message_logs")
    .select("id, group_name, group_jid, status, error_message, node_type")
    .eq("group_campaign_id", campaignId)
    .order("id", { ascending: false })
    .limit(10);

  if (logsError) {
    console.error("Error fetching logs:", logsError);
  } else {
    console.log(`Found ${logs?.length || 0} logs:`);
    for (const l of logs || []) {
      console.log(`- ID: ${l.id} | Group: ${l.group_name} | Status: ${l.status} | Error: ${l.error_message}`);
    }
  }
}

main().catch(console.error);
