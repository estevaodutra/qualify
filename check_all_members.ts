import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("company_members")
    .select('*')
    .eq('user_id', 'd947f848-9d67-45fc-af5e-d9683bd32bc9');
  console.log("Error:", error);
  console.log("Members:", JSON.stringify(data, null, 2));
}
main().catch(console.error);
