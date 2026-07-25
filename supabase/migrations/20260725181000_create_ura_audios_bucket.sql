-- Ensure the ura-audios bucket exists in Supabase Storage
insert into storage.buckets (id, name, public)
values ('ura-audios', 'ura-audios', true)
on conflict (id) do nothing;

-- Enable RLS for URA audios bucket objects
drop policy if exists "Allow public read access on URA audios" on storage.objects;
create policy "Allow public read access on URA audios"
  on storage.objects for select
  using ( bucket_id = 'ura-audios' );

drop policy if exists "Allow authenticated uploads on URA audios" on storage.objects;
create policy "Allow authenticated uploads on URA audios"
  on storage.objects for insert
  with check ( bucket_id = 'ura-audios' );

drop policy if exists "Allow authenticated updates on URA audios" on storage.objects;
create policy "Allow authenticated updates on URA audios"
  on storage.objects for update
  with check ( bucket_id = 'ura-audios' );

drop policy if exists "Allow authenticated deletes on URA audios" on storage.objects;
create policy "Allow authenticated deletes on URA audios"
  on storage.objects for delete
  using ( bucket_id = 'ura-audios' );
