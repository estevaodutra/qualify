import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('instances')
    .select('id, company_id, external_instance_id')
    .eq('id', 'ab93f07e-a236-4486-9430-a115d01c0ffc')
    .single();

  console.log("Instance check:", { data, error });
}

main().catch(console.error);
