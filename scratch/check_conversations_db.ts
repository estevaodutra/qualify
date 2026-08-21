import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id, company_id, lead_id, contact_phone, contact_name, last_message_preview, last_message_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  console.log("Latest chat_conversations in DB:", { data, error });
}

main().catch(console.error);
