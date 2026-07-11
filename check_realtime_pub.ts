import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  // Unfortunately, the easiest way to check publications is via a direct SQL query
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: `
    SELECT pubname, tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime';
  ` });
  
  if (error) {
    console.log("Error querying pg_publication_tables (might not exist as RPC, let's just create a raw query via postgres)", error);
  } else {
    console.log("Published tables:", data);
  }
}

main().catch(console.error);
