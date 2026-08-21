import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;

async function main() {
  const url = `${supabaseUrl}/functions/v1/temp-run-sql`;
  const sql = `DROP FUNCTION IF EXISTS public.process_webhook_event_for_crm_chat_test;`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ sql })
  });
  console.log("Test function cleaned up.");
}

main().catch(console.error);
