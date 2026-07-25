const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: logs, error } = await supabase
    .from('call_logs')
    .select('*, call_leads(*), call_operators(*)')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching call_logs:', error);
    return;
  }
  
  console.log('Call logs found:');
  console.log(JSON.stringify(logs, null, 2));
}

check();
