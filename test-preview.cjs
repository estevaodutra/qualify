const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: companies } = await supabase.from('companies').select('id').limit(1);
  const companyId = companies[0].id;
  
  console.log('companyId:', companyId);
  const { data, error } = await supabase.rpc('queue_remove_preview', { p_company_id: companyId });
  console.log('preview data:', JSON.stringify(data, null, 2));
  if (error) console.log('error:', error);
}

test();
