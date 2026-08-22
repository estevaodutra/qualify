import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: logs } = await supabase
    .from('group_message_logs')
    .select('provider_response, payload')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log("Group message logs responses:", JSON.stringify(logs, null, 2));
}

main().catch(console.error);
