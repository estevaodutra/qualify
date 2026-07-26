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
    },
    body: JSON.stringify({ sql })
  });

  const body = await res.json();
  if (res.ok && body.success) {
    console.log("SQL executed successfully!");
    console.log(JSON.stringify(body.result, null, 2));
  } else {
    console.error("SQL execution failed:", body.error || body);
  }
}

async function main() {
  const migrations = [
    'supabase/migrations/20260725181000_create_ura_audios_bucket.sql',
    'supabase/migrations/20260726160000_create_ura_setup_requests.sql'
  ];
  
  for (const migrationFile of migrations) {
    console.log(`Reading migration: ${migrationFile}`);
    const sql = fs.readFileSync(migrationFile, 'utf8');
    await runSql(sql);
  }
}

main().catch(console.error);
