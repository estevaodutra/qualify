import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("chat_conversations")
    .select(`
      id,
      company_id,
      lead:leads(id, name, phone)
    `)
    .eq('id', '2d8f6cd4-94b4-4966-a4e7-dcda7353cf7b'); // The conversation for the active company
  console.log("Error:", error);
  console.log("Conversations:", JSON.stringify(data, null, 2));
}
main().catch(console.error);
