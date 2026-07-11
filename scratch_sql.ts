import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.rpc('execute_sql_query', { query: "select tablename, policyname, qual, with_check from pg_policies where tablename = 'leads';" }).catch(() => ({ data: null, error: 'no rpc' }));
  console.log(data, error);
}
main().catch(console.error);
