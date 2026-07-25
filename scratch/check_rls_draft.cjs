const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: policies, error } = await supabase
    .rpc('get_policies_for_table', { table_name: 'call_operators' }); // If RPC exists, otherwise select from pg_policies
  
  if (error) {
    // Select directly from pg_policies via a generic query or check_rls.js
    const { data: directPolicies, error: directError } = await supabase
      .from('pg_policies') // Wait, pg_policies is system, we might need a custom query or we can just use a simple SQL script
      .select('*');
    // Let's execute sql command using a sql runner if available, or write a script that runs raw SQL using postgres
  }
}
