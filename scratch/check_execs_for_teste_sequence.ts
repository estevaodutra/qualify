import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: execs } = await supabase
    .from('workflow_executions')
    .select('id, sequence_id, started_at, trigger_payload, status, trigger_type')
    .eq('sequence_id', '9e07eb1a-ec0c-4db3-b03f-630ae635e716')
    .order('started_at', { ascending: false })
    .limit(5);

  console.log("Executions for sequence 9e07eb1a-ec0c-4db3-b03f-630ae635e716:", JSON.stringify(execs, null, 2));

  if (execs && execs.length > 0) {
    for (const e of execs) {
      const { data: nExecs } = await supabase
        .from('workflow_node_executions')
        .select('*')
        .eq('execution_id', e.id);
      console.log(`Node executions for ${e.id}:`, JSON.stringify(nExecs, null, 2));
    }
  }
}

main().catch(console.error);
