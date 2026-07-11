import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: conv, error } = await supabase.from('chat_conversations').select('*').eq('id', '2d8f6cd4-94b4-4966-a4e7-dcda7353cf7b').single();
  console.log("Conversation:", JSON.stringify(conv, null, 2));
}

main().catch(console.error);
