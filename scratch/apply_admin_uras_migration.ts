import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const sqlQuery = `
-- Create admin_uras table
create table if not exists public.admin_uras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ura_id text not null unique,
  description text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.admin_uras enable row level security;

-- Create policies (Allow authenticated users read and write access)
drop policy if exists "Allow authenticated users read access" on public.admin_uras;
create policy "Allow authenticated users read access"
  on public.admin_uras for select
  using ( true );

drop policy if exists "Allow authenticated users write access" on public.admin_uras;
create policy "Allow authenticated users write access"
  on public.admin_uras for all
  using ( true )
  with check ( true );
`;

async function main() {
  console.log("Executing SQL migration to create admin_uras table...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sqlQuery });
  if (error) {
    console.error("Error executing SQL:", error);
  } else {
    console.log("SQL executed successfully. admin_uras table created/verified.");
  }
}

main().catch(console.error);
