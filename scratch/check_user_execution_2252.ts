import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: exec, error: execError } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('id', 'ea45a125-7425-4729-9919-dcbfdd955186')
    .single();

  console.log("Execution detail:", { exec, execError });

  const { data: nodeExecs, error: nodeError } = await supabase
    .from('workflow_node_executions')
    .select('*')
    .eq('execution_id', 'ea45a125-7425-4729-9919-dcbfdd955186')
    .order('started_at', { ascending: true });

  console.log("Node executions for ea45a125-7425-4729-9919-dcbfdd955186:", JSON.stringify(nodeExecs, null, 2));
}

main().catch(console.error);
