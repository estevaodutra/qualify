import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const sqlQuery = fs.readFileSync('supabase/migrations/20260711194500_optimize_chat_realtime.sql', 'utf8');

async function main() {
  console.log("Executing SQL...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sqlQuery });
  if (error) {
    console.error("Error executing SQL:", error);
  } else {
    console.log("SQL executed successfully.");
  }
}

main().catch(console.error);
