import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  });

  if (error) {
    console.error("Error executing SQL:", error);
  } else {
    console.log("=== PUBLIC SCHEMA TABLES ===");
    console.log(data);
  }
}

main().catch(console.error);
