const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: tasks, error } = await supabase
    .from('workflow_call_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }
  
  console.log('Tasks found:');
  console.log(JSON.stringify(tasks, null, 2));
}

check();
