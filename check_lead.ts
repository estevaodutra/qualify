import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('leads').select('id, name, phone, company_id').eq('phone', '5512983195531');
  console.log("Error:", error);
  console.log("Leads:", data);
}
main().catch(console.error);
