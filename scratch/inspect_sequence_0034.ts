import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: seq } = await supabase
    .from('sequences')
    .select('*')
    .eq('id', '9d8bb10e-3146-4e78-af31-b89629218052')
    .single();

  console.log("Sequence info:", seq);

  const { data: nodes } = await supabase
    .from('sequence_nodes')
    .select('*')
    .eq('sequence_id', '9d8bb10e-3146-4e78-af31-b89629218052')
    .order('node_order', { ascending: true });

  console.log("Sequence nodes:", JSON.stringify(nodes, null, 2));

  const { data: connections } = await supabase
    .from('sequence_connections')
    .select('*')
    .eq('sequence_id', '9d8bb10e-3146-4e78-af31-b89629218052');

  console.log("Sequence connections:", JSON.stringify(connections, null, 2));

  // Get completed execution for this sequence
  const { data: execs } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('sequence_id', '9d8bb10e-3146-4e78-af31-b89629218052')
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(3);

  console.log("Completed executions:", JSON.stringify(execs, null, 2));

  if (execs && execs.length > 0) {
    const { data: nExecs } = await supabase
      .from('workflow_node_executions')
      .select('*')
      .eq('execution_id', execs[0].id);

    console.log(`Node executions for ${execs[0].id}:`, JSON.stringify(nExecs, null, 2));
  }
}

main().catch(console.error);
