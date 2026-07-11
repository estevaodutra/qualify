import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql', { query: `
    SELECT prosrc
    FROM pg_proc
    WHERE proname = 'process_webhook_event_for_crm_chat';
  ` });
  
  console.log("data:", data);
  console.log("err:", error);
}

check();
