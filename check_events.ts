import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('webhook_events')
    .select('id, event_type, event_subtype, classification, direction, processing_status, received_at')
    .order('received_at', { ascending: false })
    .limit(20);

  console.log("Error:", error?.message || null);
  console.log("Events:");
  if (data) {
    for (const msg of data) {
      console.log(`- ${msg.event_type} (${msg.event_subtype}) [${msg.direction}] status: ${msg.processing_status} at ${msg.received_at}`);
    }
  }
}

check();
