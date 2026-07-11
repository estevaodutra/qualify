import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('chat_messages').select('id, body, company_id, created_at').order('created_at', { ascending: false }).limit(5);
  console.log("Error:", error);
  console.log("Recent messages:", data);
}
main().catch(console.error);
