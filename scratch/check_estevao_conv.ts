import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .or('contact_phone.eq.5512982402981,contact_name.ilike.%Estev%');

  console.log("Estevao conversations in DB:", { data, error });
}

main().catch(console.error);
