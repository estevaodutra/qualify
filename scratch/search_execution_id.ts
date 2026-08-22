import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const searchId = 'ea45a125-7425-4729-9919-dcbfdd955186';

  const { data: wExec } = await supabase.from('workflow_executions').select('*').eq('id', searchId);
  console.log('workflow_executions search:', wExec);

  const { data: sExec } = await supabase.from('sequence_executions').select('*').eq('id', searchId);
  console.log('sequence_executions search:', sExec);

  const { data: gLogs } = await supabase.from('group_message_logs').select('*').eq('id', searchId);
  console.log('group_message_logs search:', gLogs);
}

main().catch(console.error);
