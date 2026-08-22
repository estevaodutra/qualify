import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('message_sequences')
    .select('id, name, content_json, nodes_json')
    .eq('id', '9e07eb1a-ec0c-4db3-b03f-630ae635e716')
    .single();

  console.log("Sequence nodes detail:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
