import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('company_id', 'dcb34e9a-1510-4137-aecd-cec0c6d548c4');

  console.log("All conversations for company:", { count: data?.length, data, error });
}

main().catch(console.error);
