-- Tech Social CRM v3.1 — Reusable post templates
-- Run after supabase-v3-roles-migration.sql.

create table if not exists public.post_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  caption text not null default '',
  hashtags text not null default '',
  platforms text[] not null default '{}',
  campaign_id text references public.campaigns(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_templates_updated_idx on public.post_templates(updated_at desc);

alter table public.post_templates enable row level security;

drop policy if exists "Approved team can view templates" on public.post_templates;
drop policy if exists "Editors can create templates" on public.post_templates;
drop policy if exists "Editors can update templates" on public.post_templates;
drop policy if exists "Editors can delete templates" on public.post_templates;

create policy "Approved team can view templates"
on public.post_templates for select to authenticated
using (public.is_allowed_user());

create policy "Editors can create templates"
on public.post_templates for insert to authenticated
with check (public.has_team_role(array['admin','editor']));

create policy "Editors can update templates"
on public.post_templates for update to authenticated
using (public.has_team_role(array['admin','editor']))
with check (public.has_team_role(array['admin','editor']));

create policy "Editors can delete templates"
on public.post_templates for delete to authenticated
using (public.has_team_role(array['admin','editor']));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='post_templates'
  ) then
    alter publication supabase_realtime add table public.post_templates;
  end if;
end $$;

notify pgrst, 'reload schema';
