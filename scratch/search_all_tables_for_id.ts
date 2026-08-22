import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;

async function main() {
  const url = `${supabaseUrl}/functions/v1/temp-run-sql`;
  const sql = `
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'id' OR column_name LIKE '%execution%';
  `;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ sql })
  });

  const body = await res.json();
  console.log("Tables with execution/id columns:", JSON.stringify(body, null, 2));
}

main().catch(console.error);
