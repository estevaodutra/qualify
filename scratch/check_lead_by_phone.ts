import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: leadsByPhone } = await supabase
    .from('leads')
    .select('id, name, phone, company_id')
    .ilike('phone', '%2981%');

  console.log("Leads matching 2981:", JSON.stringify(leadsByPhone, null, 2));
}

main().catch(console.error);
