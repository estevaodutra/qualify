import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;

async function main() {
  const url = `${supabaseUrl}/functions/v1/temp-run-sql`;
  const sql = `
    SELECT id, status, error_message, sent_at, group_jid, recipient_phone, provider_response
    FROM group_message_logs 
    ORDER BY sent_at DESC 
    LIMIT 10;
  `;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ sql })
  });

  const json = await res.json();
  console.log("SQL Group Message Logs:", JSON.stringify(json, null, 2));
}

main().catch(console.error);
