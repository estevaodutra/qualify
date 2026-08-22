import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: nodes, error } = await supabase
    .from('sequence_nodes')
    .select('*')
    .eq('sequence_id', '9e07eb1a-ec0c-4db3-b03f-630ae635e716');

  console.log("sequence_nodes for 9e07eb1a-ec0c-4db3-b03f-630ae635e716:", { count: nodes?.length, nodes, error });
}

main().catch(console.error);
