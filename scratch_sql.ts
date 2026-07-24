import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('workflow_call_tasks').select('*, workflow_executions(*)').limit(1);
  console.log(JSON.stringify(data, null, 2), error);
}
main().catch(console.error);
