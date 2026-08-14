-- Tech Social CRM media library migration
-- Run once in Supabase Dashboard → SQL Editor.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text unique not null,
  content_hash text unique not null,
  original_name text not null,
  mime_type text not null,
  media_type text not null check (media_type in ('image','video')),
  size_bytes bigint not null check (size_bytes >= 0),
  original_size_bytes bigint not null check (original_size_bytes >= 0),
  width integer,
  height integer,
  duration_seconds numeric,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.posts
  add column if not exists media_id uuid references public.media_assets(id) on delete set null;

alter table public.media_assets enable row level security;

drop policy if exists "Approved team can select media" on public.media_assets;
drop policy if exists "Approved team can insert media" on public.media_assets;
drop policy if exists "Approved team can update media" on public.media_assets;
drop policy if exists "Approved team can delete media" on public.media_assets;

create policy "Approved team can select media"
on public.media_assets for select to authenticated
using (public.is_allowed_user());

create policy "Approved team can insert media"
on public.media_assets for insert to authenticated
with check (public.is_allowed_user());

create policy "Approved team can update media"
on public.media_assets for update to authenticated
using (public.is_allowed_user()) with check (public.is_allowed_user());

create policy "Approved team can delete media"
on public.media_assets for delete to authenticated
using (public.is_allowed_user());

-- A private bucket. Images are compressed in the browser; videos are capped at 50 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tech-social-media',
  'tech-social-media',
  false,
  52428800,
  array['image/webp','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Private Storage access for approved authenticated users only.
drop policy if exists "Approved team can read social media files" on storage.objects;
drop policy if exists "Approved team can upload social media files" on storage.objects;
drop policy if exists "Approved team can update social media files" on storage.objects;
drop policy if exists "Approved team can delete social media files" on storage.objects;

create policy "Approved team can read social media files"
on storage.objects for select to authenticated
using (bucket_id = 'tech-social-media' and public.is_allowed_user());

create policy "Approved team can upload social media files"
on storage.objects for insert to authenticated
with check (bucket_id = 'tech-social-media' and public.is_allowed_user());

create policy "Approved team can update social media files"
on storage.objects for update to authenticated
using (bucket_id = 'tech-social-media' and public.is_allowed_user())
with check (bucket_id = 'tech-social-media' and public.is_allowed_user());

create policy "Approved team can delete social media files"
on storage.objects for delete to authenticated
using (bucket_id = 'tech-social-media' and public.is_allowed_user());

-- Enable live media-library updates. Re-running is safe.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='media_assets'
  ) then
    alter publication supabase_realtime add table public.media_assets;
  end if;
end $$;
