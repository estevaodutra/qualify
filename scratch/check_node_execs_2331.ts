import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: nExecs } = await supabase
    .from('workflow_node_executions')
    .select('*')
    .eq('execution_id', 'cfc6425f-5655-4e81-b5ed-da5e0d240083')
    .order('started_at', { ascending: true });

  console.log("Node executions for cfc6425f-5655-4e81-b5ed-da5e0d240083:", JSON.stringify(nExecs, null, 2));
}

main().catch(console.error);
