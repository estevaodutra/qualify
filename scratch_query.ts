import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const companyId = 'e0cd248a-f0e3-44bb-8cc6-525d1949da49';
  const adminId = 'd947f848-9d67-45fc-af5e-d9683bd32bc9'; // Estevão
  
  // Set the JWT context to simulate RLS
  await supabase.rpc('execute_sql', { sql_query: `SET LOCAL role = 'authenticated'; SET LOCAL request.jwt.claim.sub = '${adminId}';` });
  
  const { data: convs, error } = await supabase
    .from("chat_conversations")
    .select(`
      id,
      company_id,
      instance_id,
      status,
      operator_id,
      unread_count,
      last_message_preview,
      last_message_at,
      tags,
      waiting_since,
      created_at,
      updated_at,
      lead:leads(id, name, phone, email, tags, custom_fields),
      operator:profiles(id, full_name, email)
    `)
    .eq("company_id", companyId)
    .order("last_message_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(30);

  console.log("Error:", error);
  console.log("Count:", convs?.length);

}
main().catch(console.error);
