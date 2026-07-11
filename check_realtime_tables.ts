import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Checking pg_publication_tables is not possible directly via REST API if not exposed.
  // Instead, let's try to query the information_schema or just use a fallback query.
  // Wait, I can use the Edge Function 'test-db' to run raw SQL!
  
  const response = await fetch(`${supabaseUrl}/functions/v1/test-db`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  const text = await response.text();
  console.log("Response from test-db:");
  console.log(text);
}
main().catch(console.error);
