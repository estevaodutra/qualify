import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql', { query: `
    SELECT tgname, proname 
    FROM pg_trigger 
    JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
    WHERE relname = 'webhook_events';
  ` }); // won't work
}
