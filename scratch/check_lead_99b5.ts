import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, phone, company_id')
    .eq('id', '99b5072f-1f7b-44c5-b4a0-d061ed7f107f')
    .maybeSingle();

  console.log("Lead for 99b5072f-1f7b-44c5-b4a0-d061ed7f107f:", JSON.stringify(lead, null, 2));
}

main().catch(console.error);
