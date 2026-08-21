import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;

async function main() {
  const url = `${supabaseUrl}/functions/v1/temp-run-sql`;
  const sql = `
    SELECT tgname, tgenabled, proname 
    FROM pg_trigger t 
    JOIN pg_proc p ON t.tgfoid = p.oid 
    WHERE tgrelid = 'public.webhook_events'::regclass;
  `;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ sql })
  });

  const body = await res.json();
  console.log("Trigger check on webhook_events:", JSON.stringify(body, null, 2));
}

main().catch(console.error);
