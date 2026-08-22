import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: latestExec } = await supabase
    .from('workflow_executions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  console.log("Latest execution:", latestExec?.id, latestExec?.started_at);

  if (latestExec) {
    const { data: nExecs } = await supabase
      .from('workflow_node_executions')
      .select('*')
      .eq('execution_id', latestExec.id)
      .order('started_at', { ascending: true });

    console.log("Node executions:", JSON.stringify(nExecs, null, 2));
  }
}

main().catch(console.error);
