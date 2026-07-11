import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.id === 'd947f848-9d67-45fc-af5e-d9683bd32bc9');
  console.log("User:", user?.email);

  // Generate JWT for user to simulate frontend
  // But wait, there is no easy way to sign a JWT here. 
  // Let's just check the RLS directly via SQL.
}
main().catch(console.error);
