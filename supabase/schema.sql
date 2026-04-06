-- Family Command Centre — run in Supabase SQL Editor once.
-- 1. Replace the sample family UUID below OR generate one and set NEXT_PUBLIC_FAMILY_ID to match.

create extension if not exists "pgcrypto";

-- Optional: one row you can reference; app uses NEXT_PUBLIC_FAMILY_ID from env.
-- Example fixed family id (replace with your own UUID everywhere):
-- 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null,
  display_name text,
  auto_enrich boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.family_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  kind text not null,
  title text,
  body text not null,
  occurs_at timestamptz,
  due_at timestamptz,
  status text not null default 'open',
  ai_summary text,
  ai_category text,
  ai_action_items jsonb,
  ai_model text,
  ai_error text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_items_kind_check check (
    kind in ('task', 'reminder', 'event', 'idea', 'message')
  ),
  constraint family_items_status_check check (status in ('open', 'done'))
);

create index if not exists family_items_family_created_idx
  on public.family_items (family_id, created_at desc);

create index if not exists family_items_family_kind_idx
  on public.family_items (family_id, kind);

create or replace function public.set_family_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists family_items_set_updated_at on public.family_items;
create trigger family_items_set_updated_at
  before update on public.family_items
  for each row
  execute function public.set_family_items_updated_at();

alter table public.profiles enable row level security;
alter table public.family_items enable row level security;

-- Profiles
drop policy if exists "profiles_select_family" on public.profiles;
create policy "profiles_select_family"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.family_id = profiles.family_id
    )
  );

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Family items (scoped by profile.family_id)
drop policy if exists "family_items_select" on public.family_items;
create policy "family_items_select"
  on public.family_items for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.family_id = family_items.family_id
    )
  );

drop policy if exists "family_items_insert" on public.family_items;
create policy "family_items_insert"
  on public.family_items for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.family_id = family_items.family_id
    )
    and created_by = auth.uid()
  );

drop policy if exists "family_items_update" on public.family_items;
create policy "family_items_update"
  on public.family_items for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.family_id = family_items.family_id
    )
  );

drop policy if exists "family_items_delete" on public.family_items;
create policy "family_items_delete"
  on public.family_items for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.family_id = family_items.family_id
    )
  );
