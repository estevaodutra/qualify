import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: execs } = await supabase
    .from('workflow_executions')
    .select('id, sequence_id, started_at, trigger_payload, status, trigger_type')
    .order('started_at', { ascending: false })
    .limit(5);

  console.log("Latest 5 execs:", JSON.stringify(execs, null, 2));
}

main().catch(console.error);
