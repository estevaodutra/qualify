import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: seqs } = await supabase
    .from('message_sequences')
    .select('id, name, content_json, nodes_json');

  console.log("All message_sequences count:", seqs?.length);
  if (seqs && seqs.length > 0) {
    console.log("Sample seq:", JSON.stringify(seqs[0], null, 2));
  }
}

main().catch(console.error);
