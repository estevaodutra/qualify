import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: nodeExecs } = await supabase
    .from('workflow_node_executions')
    .select('*')
    .eq('execution_id', '6e60d721-dd9c-4d25-a530-f48a44778ec9')
    .order('started_at', { ascending: true });

  console.log("Full node executions for 6e60d721-dd9c-4d25-a530-f48a44778ec9:", JSON.stringify(nodeExecs, null, 2));
}

main().catch(console.error);
