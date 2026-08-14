const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qualify-supabase.d2x.site';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODYwNjQ2MzEsImV4cCI6MjEwMTQyNDYzMX0.uTb3j5LmhaahnXkSLXQGoDpAjYAnW2UxCmiK0pnfshU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from("call_logs")
    .select("id, campaign_id, lead_id, attempt_number, duration_seconds, notes, call_status, external_call_id, audio_url, operator_id, call_leads(name, phone), call_campaigns!call_logs_campaign_id_fkey(name, retry_count, is_priority)")
    .limit(1);
    
  console.log("Error from call_logs select:");
  console.log(error);

  const { data: data2, error: error2 } = await supabase
    .from("call_logs")
    .select("*, call_leads!call_logs_lead_id_fkey(name, phone, email, custom_fields), call_campaigns!call_logs_campaign_id_fkey(name, is_priority, retry_count)")
    .limit(1);

  console.log("Error from useOperatorCall select:");
  console.log(error2);
}
run();
