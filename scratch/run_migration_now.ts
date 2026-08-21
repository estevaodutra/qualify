import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;

async function runSql(sql: string) {
  const url = `${supabaseUrl}/functions/v1/temp-run-sql`;
  console.log(`POSTing SQL to ${url}...`);
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ sql })
  });

  const text = await res.text();
  console.log("Response status:", res.status);
  console.log("Response body:", text);
}

async function main() {
  const sql = fs.readFileSync('supabase/migrations/20260821180000_disable_auto_lead_creation.sql', 'utf8');
  await runSql(sql);
}

main().catch(console.error);
