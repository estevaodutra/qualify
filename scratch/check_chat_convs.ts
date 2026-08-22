import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  // 1. Check chat_conversations matching 2981 or Estevão
  const { data: convs } = await supabase
    .from('chat_conversations')
    .select('*')
    .or('contact_phone.ilike.%2981%,contact_name.ilike.%Estevão%');

  console.log("Chat conversations for 2981:", JSON.stringify(convs, null, 2));

  if (convs && convs.length > 0) {
    for (const c of convs) {
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false });

      console.log(`Chat messages for conv ${c.id}:`, JSON.stringify(msgs, null, 2));
    }
  }
}

main().catch(console.error);
