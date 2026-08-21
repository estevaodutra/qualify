import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('webhook_events')
    .select('id, event_type, sender_phone, sender_name, instance_id, external_instance_id, classification, received_at')
    .order('received_at', { ascending: false })
    .limit(10);

  console.log("Recent webhook_events:", { data, error });
}

main().catch(console.error);
