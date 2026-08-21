import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase.from('chat_conversations').select('id, lead_id, contact_phone, contact_name').limit(2);
  console.log("chat_conversations columns check:", { data, error });
}

main().catch(console.error);
