const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
const vars = {};
lines.forEach(l => {
  const [k, ...v] = l.split('=');
  if (k) vars[k] = v.join('=').replace(/^"|"$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(vars['VITE_SUPABASE_URL'], vars['VITE_SUPABASE_PUBLISHABLE_KEY']);
async function run() {
  const { data, error } = await supabase.from('message_sequences').select('group_campaign_id').eq('id', '5f702596-d2f2-4354-ab59-a6aa637226cf').single();
  console.log('campaign_id:', data?.group_campaign_id);
}
run();
