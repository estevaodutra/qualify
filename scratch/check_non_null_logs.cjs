const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: logs, error } = await supabase
    .from('call_logs')
    .select('id, lead_id, campaign_id, created_at')
    .is('campaign_id', null)
    .not('lead_id', 'is', null)
    .limit(10);
  
  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }
  
  console.log('Logs with null campaign_id and non-null lead_id:', logs);
}

check();
