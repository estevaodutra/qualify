const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data } = await supabase.from('workflow_call_tasks').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Call tasks:', JSON.stringify(data, null, 2));
}

test();
