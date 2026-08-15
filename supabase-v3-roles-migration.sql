-- Tech Social CRM v3.0 — Team roles and permissions
-- Run after the version 2.x migrations.

alter table public.allowed_users
  add column if not exists role text not null default 'viewer'
  check (role in ('admin','editor','approver','viewer'));

-- Ensure the account is not locked out: promote the oldest approved user if no admin exists.
update public.allowed_users
set role = 'admin'
where email = (
  select email from public.allowed_users order by added_at asc limit 1
)
and not exists (select 1 from public.allowed_users where role = 'admin');

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role from public.allowed_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  ), 'none');
$$;

create or replace function public.has_team_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = any(allowed_roles);
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.has_team_role(text[]) from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.has_team_role(text[]) to authenticated;

-- Users may change only their own display name, never their email or role.
create or replace function public.update_own_profile(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_allowed_user() then raise exception 'Not approved'; end if;
  if char_length(trim(p_display_name)) < 1 or char_length(trim(p_display_name)) > 100 then
    raise exception 'Display name must contain 1 to 100 characters';
  end if;
  update public.allowed_users
  set display_name = trim(p_display_name)
  where email = lower(auth.jwt() ->> 'email');
end;
$$;
revoke all on function public.update_own_profile(text) from public, anon;
grant execute on function public.update_own_profile(text) to authenticated;

-- Approvers and admins can change only the approval state through this RPC.
create or replace function public.set_post_approval(p_post_id text, p_decision text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if not public.has_team_role(array['admin','approver']) then raise exception 'Approver role required'; end if;
  if p_decision = 'approve' then next_status := 'ready';
  elsif p_decision = 'changes' then next_status := 'draft';
  else raise exception 'Invalid approval decision';
  end if;
  update public.posts set status = next_status, updated_at = now(), updated_by = auth.uid() where id = p_post_id;
  if not found then raise exception 'Post not found'; end if;
  return next_status;
end;
$$;
revoke all on function public.set_post_approval(text,text) from public, anon;
grant execute on function public.set_post_approval(text,text) to authenticated;

-- Replace allowed_users policies. Direct self-update is deliberately removed.
drop policy if exists "Approved users can view their own approval" on public.allowed_users;
drop policy if exists "Approved users can update their own profile" on public.allowed_users;
drop policy if exists "Team can view permitted users" on public.allowed_users;
drop policy if exists "Admins can add users" on public.allowed_users;
drop policy if exists "Admins can update users" on public.allowed_users;
drop policy if exists "Admins can remove users" on public.allowed_users;

create policy "Team can view permitted users"
on public.allowed_users for select to authenticated
using (email = lower(coalesce(auth.jwt() ->> 'email', '')) or public.has_team_role(array['admin']));
create policy "Admins can add users"
on public.allowed_users for insert to authenticated
with check (public.has_team_role(array['admin']));
create policy "Admins can update users"
on public.allowed_users for update to authenticated
using (public.has_team_role(array['admin'])) with check (public.has_team_role(array['admin']));
create policy "Admins can remove users"
on public.allowed_users for delete to authenticated
using (public.has_team_role(array['admin']) and email <> lower(auth.jwt() ->> 'email'));

-- Content tables: everyone approved can read; editors/admins write.
do $$
declare table_name text;
begin
  foreach table_name in array array['posts','campaigns','media_assets'] loop
    execute format('drop policy if exists "Approved team can select" on public.%I', table_name);
    execute format('drop policy if exists "Approved team can insert" on public.%I', table_name);
    execute format('drop policy if exists "Approved team can update" on public.%I', table_name);
    execute format('drop policy if exists "Approved team can delete" on public.%I', table_name);
    execute format('drop policy if exists "Role based select" on public.%I', table_name);
    execute format('drop policy if exists "Editors can insert" on public.%I', table_name);
    execute format('drop policy if exists "Editors can update" on public.%I', table_name);
    execute format('drop policy if exists "Editors can delete" on public.%I', table_name);
    execute format('create policy "Role based select" on public.%I for select to authenticated using (public.is_allowed_user())', table_name);
    execute format('create policy "Editors can insert" on public.%I for insert to authenticated with check (public.has_team_role(array[''admin'',''editor'']))', table_name);
    execute format('create policy "Editors can update" on public.%I for update to authenticated using (public.has_team_role(array[''admin'',''editor''])) with check (public.has_team_role(array[''admin'',''editor'']))', table_name);
    execute format('create policy "Editors can delete" on public.%I for delete to authenticated using (public.has_team_role(array[''admin'',''editor'']))', table_name);
  end loop;
end $$;

-- Team requests: viewers read only; other roles collaborate. Request owners and admins can delete.
drop policy if exists "Approved team can select" on public.team_requests;
drop policy if exists "Approved team can insert" on public.team_requests;
drop policy if exists "Approved team can update" on public.team_requests;
drop policy if exists "Approved team can delete" on public.team_requests;
drop policy if exists "Role based select" on public.team_requests;
drop policy if exists "Team can create requests" on public.team_requests;
drop policy if exists "Team can update requests" on public.team_requests;
drop policy if exists "Owners or admins can delete requests" on public.team_requests;
create policy "Role based select" on public.team_requests for select to authenticated using (public.is_allowed_user());
create policy "Team can create requests" on public.team_requests for insert to authenticated with check (public.has_team_role(array['admin','editor','approver']));
create policy "Team can update requests" on public.team_requests for update to authenticated using (public.has_team_role(array['admin','editor','approver'])) with check (public.has_team_role(array['admin','editor','approver']));
create policy "Owners or admins can delete requests" on public.team_requests for delete to authenticated using (requested_by = auth.uid() or public.has_team_role(array['admin']));

-- Shared inbox: viewers read; other roles add messages; admins/editors can remove records.
do $$
declare table_name text;
begin
  foreach table_name in array array['social_threads','social_messages'] loop
    execute format('drop policy if exists "Approved team can select" on public.%I', table_name);
    execute format('drop policy if exists "Approved team can insert" on public.%I', table_name);
    execute format('drop policy if exists "Approved team can update" on public.%I', table_name);
    execute format('drop policy if exists "Approved team can delete" on public.%I', table_name);
    execute format('drop policy if exists "Role based select" on public.%I', table_name);
    execute format('drop policy if exists "Team can insert" on public.%I', table_name);
    execute format('drop policy if exists "Team can update" on public.%I', table_name);
    execute format('drop policy if exists "Admins and editors can delete" on public.%I', table_name);
    execute format('create policy "Role based select" on public.%I for select to authenticated using (public.is_allowed_user())', table_name);
    execute format('create policy "Team can insert" on public.%I for insert to authenticated with check (public.has_team_role(array[''admin'',''editor'',''approver'']))', table_name);
    execute format('create policy "Team can update" on public.%I for update to authenticated using (public.has_team_role(array[''admin'',''editor'',''approver''])) with check (public.has_team_role(array[''admin'',''editor'',''approver'']))', table_name);
    execute format('create policy "Admins and editors can delete" on public.%I for delete to authenticated using (public.has_team_role(array[''admin'',''editor'']))', table_name);
  end loop;
end $$;

-- Shared social account readiness follows editor permissions.
drop policy if exists "Approved team can select" on public.social_accounts;
drop policy if exists "Approved team can insert" on public.social_accounts;
drop policy if exists "Approved team can update" on public.social_accounts;
drop policy if exists "Approved team can delete" on public.social_accounts;
drop policy if exists "Role based select" on public.social_accounts;
drop policy if exists "Editors can update accounts" on public.social_accounts;
drop policy if exists "Editors can insert accounts" on public.social_accounts;
create policy "Role based select" on public.social_accounts for select to authenticated using (public.is_allowed_user());
create policy "Editors can update accounts" on public.social_accounts for update to authenticated using (public.has_team_role(array['admin','editor'])) with check (public.has_team_role(array['admin','editor']));
create policy "Editors can insert accounts" on public.social_accounts for insert to authenticated with check (public.has_team_role(array['admin','editor']));

-- Storage object permissions now match editor/admin media permissions.
drop policy if exists "Approved team can read social media files" on storage.objects;
drop policy if exists "Approved team can upload social media files" on storage.objects;
drop policy if exists "Approved team can update social media files" on storage.objects;
drop policy if exists "Approved team can delete social media files" on storage.objects;
drop policy if exists "Editors can upload social media files" on storage.objects;
drop policy if exists "Editors can update social media files" on storage.objects;
drop policy if exists "Editors can delete social media files" on storage.objects;
create policy "Approved team can read social media files" on storage.objects for select to authenticated using (bucket_id='tech-social-media' and public.is_allowed_user());
create policy "Editors can upload social media files" on storage.objects for insert to authenticated with check (bucket_id='tech-social-media' and public.has_team_role(array['admin','editor']));
create policy "Editors can update social media files" on storage.objects for update to authenticated using (bucket_id='tech-social-media' and public.has_team_role(array['admin','editor'])) with check (bucket_id='tech-social-media' and public.has_team_role(array['admin','editor']));
create policy "Editors can delete social media files" on storage.objects for delete to authenticated using (bucket_id='tech-social-media' and public.has_team_role(array['admin','editor']));

notify pgrst, 'reload schema';
