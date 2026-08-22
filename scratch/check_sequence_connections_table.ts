import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: connections, error } = await supabase
    .from('sequence_connections')
    .select('*')
    .eq('sequence_id', '9e07eb1a-ec0c-4db3-b03f-630ae635e716');

  console.log("sequence_connections for 9e07eb1a-ec0c-4db3-b03f-630ae635e716:", JSON.stringify(connections, null, 2));
}

main().catch(console.error);
