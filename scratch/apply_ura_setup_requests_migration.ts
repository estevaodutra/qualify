import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const sqlQuery = `
-- Table for URA setup requests (approval cycle)
create table if not exists public.ura_setup_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workflow_id uuid references public.message_sequences(id) on delete cascade,
  node_id text not null,
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending_admin_setup' check (status in ('pending_admin_setup', 'in_setup', 'approved', 'rejected', 'needs_adjustment', 'cancelled')),
  ura_name text not null,
  ura_mode text not null check (ura_mode in ('simple', 'reverse')),
  audio_type text not null check (audio_type in ('audio', 'tts', 'mos_ura')),
  audio_value text,
  audio_file_url text,
  audio_file_name text,
  dtmf_actions jsonb default '[]'::jsonb,
  attempts_config jsonb default '{}'::jsonb,
  mos_campaign_id text,
  mos_ura_id text,
  mos_campaign_name text,
  admin_notes text,
  rejection_reason text,
  requested_at timestamptz default now() not null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.ura_setup_requests enable row level security;

-- Policy
drop policy if exists "Members can manage URA requests" on public.ura_setup_requests;
create policy "Members can manage URA requests" on public.ura_setup_requests
  for all to authenticated using (is_company_member(company_id, auth.uid()));
`;

async function main() {
  console.log("Executing SQL migration to create public.ura_setup_requests table...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sqlQuery });
  if (error) {
    console.error("Error executing SQL:", error);
  } else {
    console.log("SQL executed successfully. public.ura_setup_requests table created/verified.");
  }
}

main().catch(console.error);
