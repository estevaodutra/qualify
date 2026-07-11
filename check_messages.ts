import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('body, created_at, sender_type')
    .ilike('body', 'Teste%')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log("Error:", error?.message || null);
  console.log("Messages:");
  if (data) {
    for (const msg of data) {
      console.log(`- ${msg.body} (${msg.sender_type}) at ${msg.created_at}`);
    }
  }
}

check();
