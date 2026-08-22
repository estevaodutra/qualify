import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: execs, error: execError } = await supabase
    .from('workflow_executions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  console.log("Latest workflow_executions:", { execs, execError });

  if (execs && execs.length > 0) {
    const latestId = execs[0].id;
    const { data: nodeExecs, error: nodeError } = await supabase
      .from('workflow_node_executions')
      .select('*')
      .eq('execution_id', latestId);

    console.log(`Node executions for ${latestId}:`, { nodeExecs, nodeError });
  }
}

main().catch(console.error);
