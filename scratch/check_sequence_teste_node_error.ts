import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: execs } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('sequence_id', '9e07eb1a-ec0c-4db3-b03f-630ae635e716')
    .order('started_at', { ascending: false })
    .limit(5);

  for (const exec of execs || []) {
    const { data: nodes } = await supabase
      .from('workflow_node_executions')
      .select('*')
      .eq('execution_id', exec.id)
      .order('started_at', { ascending: true });

    console.log(`\n=================== Execution ${exec.id} (${exec.started_at}) ===================`);
    for (const n of nodes || []) {
      console.log(`Node ${n.node_id} (${n.node_type}) status=${n.status}:`, {
        input: n.input,
        output: n.output,
        error: n.error,
      });
    }
  }
}

main().catch(console.error);
