import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: nodeExecs } = await supabase
    .from('workflow_node_executions')
    .select('*')
    .eq('execution_id', '6990e27b-f89a-4a09-8519-62c001d7db33')
    .order('started_at', { ascending: true });

  console.log("Node executions for 6990e27b-f89a-4a09-8519-62c001d7db33:", JSON.stringify(nodeExecs, null, 2));
}

main().catch(console.error);
