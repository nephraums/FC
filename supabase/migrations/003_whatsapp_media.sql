-- Photos from WhatsApp: public URLs stored on each item (uploaded to Storage).
-- Run in Supabase SQL Editor after prior migrations.

alter table public.family_items
  add column if not exists media_urls jsonb;

-- Public bucket so the web app can show <img src="..."> without signed URLs.
insert into storage.buckets (id, name, public)
values ('family-media', 'family-media', true)
on conflict (id) do update set public = excluded.public;

-- Authenticated users in your app can read objects (defense in depth; URLs are still unguessable paths).
drop policy if exists "family_media_select_authenticated" on storage.objects;
create policy "family_media_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'family-media');
