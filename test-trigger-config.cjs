const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const seqId = '2f4edc61-39af-4794-881e-e14f7909fdff';
  const { data } = await supabase.from('workflow_definitions').select('state').eq('id', seqId);
  if (data && data.length > 0) {
    console.log('Workflow state nodes:', JSON.stringify(data[0].state.nodes, null, 2));
  } else {
    console.log('Not found in workflow_definitions!');
  }
}

test();
