import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, phone, company_id')
    .eq('phone', '5512982402981');

  console.log("Lead check for 5512982402981:", { data, error });
}

main().catch(console.error);
