import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: execs } = await supabase
    .from('workflow_executions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20);

  console.log("Recent 20 executions:");
  for (const e of execs || []) {
    console.log(` - ID: ${e.id} | Sequence: ${e.sequence_id} | Status: ${e.status} | Started: ${e.started_at}`);
  }
}

main().catch(console.error);
