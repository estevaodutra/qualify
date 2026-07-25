const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: operators, error } = await supabase
    .from('call_operators')
    .select('*');
  
  if (error) {
    console.error('Error fetching operators:', error);
    return;
  }
  
  console.log('Operators found:');
  console.log(JSON.stringify(operators, null, 2));
}

check();
