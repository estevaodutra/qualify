import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('id', '3b6a1d85-807b-431f-8e86-1eb00ac11a49')
    .single();

  console.log("User event detail:", { data, error });
}

main().catch(console.error);
