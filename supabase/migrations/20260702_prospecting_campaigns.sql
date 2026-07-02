-- Tabela de Campanhas de Prospecção
create table if not exists public.prospecting_campaigns (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  status text not null default 'running', -- running, completed, error
  search_terms text not null,
  quantity integer not null,
  category text,
  exact_names boolean default false,
  places text,
  post_action_id uuid, -- Referência a uma campanha para onde enviar depois
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.prospecting_campaigns enable row level security;

-- Políticas de segurança
create policy "Usuários podem ver suas próprias campanhas de prospecção"
  on public.prospecting_campaigns for select
  using (auth.uid() = user_id);

create policy "Usuários podem criar campanhas de prospecção"
  on public.prospecting_campaigns for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar suas próprias campanhas de prospecção"
  on public.prospecting_campaigns for update
  using (auth.uid() = user_id);

create policy "Usuários podem excluir suas próprias campanhas de prospecção"
  on public.prospecting_campaigns for delete
  using (auth.uid() = user_id);
