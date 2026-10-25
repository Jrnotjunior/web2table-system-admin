-- Access-control RPCs used by the System Admin dashboard.
-- Mutations require a verified MFA session and an active Owner/Administrator.
create or replace function public.system_admin_set_access_level(p_access_level text, p_admin_user_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_email text;
  v_actor_email text;
  v_old_level text;
begin
  if v_actor is null or not private.privileged_session_verified()
    or not exists (select 1 from public.platform_admins where user_id=v_actor and is_active and access_level in ('owner','administrator')) then
    raise exception 'MFA-verified Owner or Administrator session required' using errcode='42501';
  end if;
  if p_admin_user_id is null or p_admin_user_id=v_actor then raise exception 'You cannot change your own access level' using errcode='22023'; end if;
  if p_access_level not in ('administrator','view_only') then raise exception 'Unsupported access level' using errcode='22023'; end if;
  select a.access_level,u.email into v_old_level,v_email from public.platform_admins a join auth.users u on u.id=a.user_id where a.user_id=p_admin_user_id and a.is_active for update of a;
  if not found then raise exception 'Active target administrator was not found' using errcode='P0002'; end if;
  if v_old_level='owner' then raise exception 'The Owner account cannot be changed' using errcode='42501'; end if;
  update public.platform_admins set access_level=p_access_level where user_id=p_admin_user_id;
  select email into v_actor_email from auth.users where id=v_actor;
  insert into public.system_admin_audit_logs(admin_user_id,admin_email,event_type,action,entity_type,entity_id,details)
  values(v_actor,v_actor_email,'administrative','system_admin_access_level_changed','platform_admin',p_admin_user_id::text,jsonb_build_object('target_email',v_email,'old_access_level',v_old_level,'new_access_level',p_access_level));
  return true;
end $$;

create or replace function public.system_admin_revoke_access(p_admin_user_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_email text; v_actor_email text; v_level text;
begin
  if v_actor is null or not private.privileged_session_verified() or not exists(select 1 from public.platform_admins where user_id=v_actor and is_active and access_level in ('owner','administrator')) then raise exception 'MFA-verified Owner or Administrator session required' using errcode='42501'; end if;
  if p_admin_user_id is null or p_admin_user_id=v_actor then raise exception 'You cannot revoke your own access' using errcode='22023'; end if;
  select a.access_level,u.email into v_level,v_email from public.platform_admins a join auth.users u on u.id=a.user_id where a.user_id=p_admin_user_id and a.is_active for update of a;
  if not found then raise exception 'Active target administrator was not found' using errcode='P0002'; end if;
  if v_level='owner' then raise exception 'The Owner account cannot be revoked' using errcode='42501'; end if;
  update public.platform_admins set is_active=false where user_id=p_admin_user_id;
  update private.platform_admin_invitations set status='revoked' where invited_user_id=p_admin_user_id and status in ('sent','accepted');
  select email into v_actor_email from auth.users where id=v_actor;
  insert into public.system_admin_audit_logs(admin_user_id,admin_email,event_type,action,entity_type,entity_id,details)
  values(v_actor,v_actor_email,'administrative','system_admin_access_revoked','platform_admin',p_admin_user_id::text,jsonb_build_object('target_email',v_email,'access_level',v_level));
  return true;
end $$;

create or replace function public.system_admin_restore_access(p_admin_user_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_email text; v_actor_email text; v_level text;
begin
  if v_actor is null or not private.privileged_session_verified() or not exists(select 1 from public.platform_admins where user_id=v_actor and is_active and access_level in ('owner','administrator')) then raise exception 'MFA-verified Owner or Administrator session required' using errcode='42501'; end if;
  if p_admin_user_id is null or p_admin_user_id=v_actor then raise exception 'Invalid target administrator' using errcode='22023'; end if;
  select a.access_level,u.email into v_level,v_email from public.platform_admins a join auth.users u on u.id=a.user_id where a.user_id=p_admin_user_id and not a.is_active for update of a;
  if not found then raise exception 'Revoked target administrator was not found' using errcode='P0002'; end if;
  if v_level='owner' then raise exception 'The Owner account cannot be restored through this action' using errcode='42501'; end if;
  update public.platform_admins set is_active=true where user_id=p_admin_user_id;
  update private.platform_admin_invitations set status='accepted' where invited_user_id=p_admin_user_id and status='revoked';
  select email into v_actor_email from auth.users where id=v_actor;
  insert into public.system_admin_audit_logs(admin_user_id,admin_email,event_type,action,entity_type,entity_id,details)
  values(v_actor,v_actor_email,'administrative','system_admin_access_restored','platform_admin',p_admin_user_id::text,jsonb_build_object('target_email',v_email,'access_level',v_level));
  return true;
end $$;

create or replace function public.system_admin_delete_revoked_access(p_admin_user_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_email text; v_actor_email text; v_level text;
begin
  if v_actor is null or not private.privileged_session_verified() or not exists(select 1 from public.platform_admins where user_id=v_actor and is_active and access_level in ('owner','administrator')) then raise exception 'MFA-verified Owner or Administrator session required' using errcode='42501'; end if;
  if p_admin_user_id is null or p_admin_user_id=v_actor then raise exception 'Invalid target administrator' using errcode='22023'; end if;
  select a.access_level,u.email into v_level,v_email from public.platform_admins a join auth.users u on u.id=a.user_id where a.user_id=p_admin_user_id and not a.is_active for update of a;
  if not found then raise exception 'Only a revoked administrator can be deleted' using errcode='P0002'; end if;
  if v_level='owner' then raise exception 'The Owner account cannot be deleted' using errcode='42501'; end if;
  select email into v_actor_email from auth.users where id=v_actor;
  insert into public.system_admin_audit_logs(admin_user_id,admin_email,event_type,action,entity_type,entity_id,details)
  values(v_actor,v_actor_email,'administrative','system_admin_access_deleted','platform_admin',p_admin_user_id::text,jsonb_build_object('target_email',v_email,'access_level',v_level));
  delete from private.platform_admin_invitations where invited_user_id=p_admin_user_id;
  delete from public.platform_admins where user_id=p_admin_user_id;
  return true;
end $$;

revoke all on function public.system_admin_set_access_level(text,uuid) from public, anon;
revoke all on function public.system_admin_revoke_access(uuid) from public, anon;
revoke all on function public.system_admin_restore_access(uuid) from public, anon;
revoke all on function public.system_admin_delete_revoked_access(uuid) from public, anon;
grant execute on function public.system_admin_set_access_level(text,uuid) to authenticated;
grant execute on function public.system_admin_revoke_access(uuid) to authenticated;
grant execute on function public.system_admin_restore_access(uuid) to authenticated;
grant execute on function public.system_admin_delete_revoked_access(uuid) to authenticated;
notify pgrst, 'reload schema';
