import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('chat_conversations').select('id, company_id, lead_id').eq('lead_id', 'b5bb554d-3213-46db-8c83-f70b69e4fa6e');
  console.log("Error:", error);
  console.log("Conversations:", data);
}
main().catch(console.error);
