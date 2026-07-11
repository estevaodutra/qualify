import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: msgs } = await supabase.from('chat_messages').select('id, body, created_at, message_id').order('created_at', { ascending: false }).limit(5);
  console.log("Recent Chat Messages:", msgs);
}

main().catch(console.error);
