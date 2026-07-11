import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.rpc('get_policy', { table_name: 'leads' }).catch(() => ({ data: null, error: 'no rpc' }));
  
  if (error === 'no rpc' || error) {
      // let's run a raw query using a generic query rpc if available, or just use psql via terminal
  }
}
main().catch(console.error);
