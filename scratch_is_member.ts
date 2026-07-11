import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: "SELECT pg_get_functiondef('public.is_company_member'::regproc);" });
  console.log("is_company_member def:", data, error);
  
  if (error) {
    // try direct query via rest if possible, or fallback
    const { data: pData } = await supabase.from('pg_policies').select('*').eq('tablename', 'chat_conversations');
    console.log("policies:", pData);
  }
}
main().catch(console.error);
