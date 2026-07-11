import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('instances')
    .select('id, name, status');
    
  console.log("Error:", error?.message || null);
  console.log("Instances:");
  if (data) {
    for (const inst of data) {
      console.log(`- ${inst.name}: ${inst.status}`);
    }
  }
}

check();
