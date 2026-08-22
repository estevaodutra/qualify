import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: exec } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('id', 'a993e27b-109a-4a09-8519-62c001c7db53')
    .maybeSingle();

  console.log("Execution 00:34 detail:", JSON.stringify(exec, null, 2));

  const { data: nodeExecs } = await supabase
    .from('workflow_node_executions')
    .select('*')
    .eq('execution_id', 'a993e27b-109a-4a09-8519-62c001c7db53')
    .order('started_at', { ascending: true });

  console.log("Node executions for a993e27b-109a-4a09-8519-62c001c7db53:", JSON.stringify(nodeExecs, null, 2));

  // Check sequence_nodes for sequence_id
  if (exec?.sequence_id) {
    const { data: seqNodes } = await supabase
      .from('sequence_nodes')
      .select('*')
      .eq('sequence_id', exec.sequence_id);

    console.log("Sequence nodes in DB:", JSON.stringify(seqNodes, null, 2));
  }
}

main().catch(console.error);
