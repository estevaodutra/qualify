import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: exec } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('id', 'e6a02b9b-714c-42ec-84d5-c94e66747ac2')
    .single();

  console.log("Execution 23:30 detail:", JSON.stringify(exec, null, 2));

  const { data: nodeExecs } = await supabase
    .from('workflow_node_executions')
    .select('*')
    .eq('execution_id', 'e6a02b9b-714c-42ec-84d5-c94e66747ac2')
    .order('started_at', { ascending: true });

  console.log("Node executions for e6a02b9b-714c-42ec-84d5-c94e66747ac2:", JSON.stringify(nodeExecs, null, 2));
}

main().catch(console.error);
