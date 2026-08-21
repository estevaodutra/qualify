import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('id', '548ba482-e0e3-4c83-8c20-f0a7e4ae9353')
    .single();

  console.log("Single event detail:", { data, error });
}

main().catch(console.error);
