import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('sequence_nodes').select('*').eq('sequence_id', 'd9d22d59-5e83-4aec-a287-bf89c9557a80').order('node_order');
  console.log(JSON.stringify(error || data, null, 2));
}
run();