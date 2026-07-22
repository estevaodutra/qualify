import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const sqlQuery = fs.readFileSync('supabase/migrations/20260722173500_leads_journey_tracking.sql', 'utf8');

async function main() {
  console.log("Executing Leads Journey Tracking SQL...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sqlQuery });
  if (error) {
    console.error("Error executing SQL:", error);
  } else {
    console.log("SQL executed successfully.");
  }
}

main().catch(console.error);
