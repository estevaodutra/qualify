import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const tables = [
  "group_campaigns",
  "campaign_groups",
  "message_sequences",
  "sequence_executions",
  "workflow_definitions",
  "workflow_folders",
  "workflow_executions",
  "workflow_node_executions",
  "workflow_execution_history"
];

async function main() {
  console.log("=== CHECKING TABLES ===");
  for (const table of tables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(`❌ Table '${table}' ERROR: ${error.code} - ${error.message}`);
    } else {
      console.log(`✅ Table '${table}' exists!`);
    }
  }
}

main().catch(console.error);
