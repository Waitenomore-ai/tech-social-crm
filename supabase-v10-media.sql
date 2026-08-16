-- Tech Social CRM V10 — Content / Media Library
-- Safe to run once in Supabase SQL Editor.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  filename text,
  mime_type text,
  url text,
  public_url text,
  storage_path text,
  category text not null default 'photo' check (category in ('photo','video','graphic','logo')),
  folder text not null default '',
  tags text[] not null default '{}',
  description text not null default '',
  campaign_id uuid references public.campaigns(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_assets_created_idx on public.media_assets(created_at desc);
create index if not exists media_assets_category_idx on public.media_assets(category);
create index if not exists media_assets_campaign_idx on public.media_assets(campaign_id);

alter table public.media_assets enable row level security;

drop policy if exists "Approved team can select media assets" on public.media_assets;
drop policy if exists "Approved team can insert media assets" on public.media_assets;
drop policy if exists "Approved team can update media assets" on public.media_assets;
drop policy if exists "Approved team can delete media assets" on public.media_assets;

create policy "Approved team can select media assets" on public.media_assets for select to authenticated using (public.is_allowed_user());
create policy "Approved team can insert media assets" on public.media_assets for insert to authenticated with check (public.is_allowed_user());
create policy "Approved team can update media assets" on public.media_assets for update to authenticated using (public.is_allowed_user()) with check (public.is_allowed_user());
create policy "Approved team can delete media assets" on public.media_assets for delete to authenticated using (public.is_allowed_user());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='media_assets') then
    alter publication supabase_realtime add table public.media_assets;
  end if;
end $$;

notify pgrst, 'reload schema';
