-- System Admin invitation and access-level lifecycle.
-- Applied to Supabase project wvibrchebfwirbgkcnbr on 2026-10-24.

alter table public.platform_admins
  add column if not exists access_level text not null default 'administrator';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'platform_admins_access_level_check'
      and conrelid = 'public.platform_admins'::regclass
  ) then
    alter table public.platform_admins
      add constraint platform_admins_access_level_check
      check (access_level in ('owner', 'administrator', 'view_only'));
  end if;
end $$;

update public.platform_admins a
set access_level = 'owner'
where a.user_id = (
  select p.user_id from public.platform_admins p order by p.created_at asc, p.user_id asc limit 1
)
and not exists (select 1 from public.platform_admins p where p.access_level = 'owner');

create table if not exists private.platform_admin_invitations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  email text not null unique,
  name text not null,
  access_level text not null check (access_level in ('administrator', 'view_only')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  invited_user_id uuid references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'sent', 'accepted', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  constraint platform_admin_invitations_normalized_email
    check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  constraint platform_admin_invitations_name_nonempty
    check (length(btrim(name)) between 1 and 120)
);
alter table private.platform_admin_invitations enable row level security;
revoke all on private.platform_admin_invitations from public, anon, authenticated;

create or replace function public.system_admin_invitation_prepare_for_service(
  p_email text, p_name text, p_access_level text, p_invited_by uuid
)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if v_email = '' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Enter a valid email address' using errcode='22023';
  end if;
  if v_name = '' or length(v_name) > 120 then
    raise exception 'Name must be between 1 and 120 characters' using errcode='22023';
  end if;
  if p_access_level not in ('administrator', 'view_only') then
    raise exception 'Unsupported System Admin access level' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.platform_admins a
    where a.user_id = p_invited_by and a.is_active
      and a.access_level in ('owner', 'administrator')
  ) then
    raise exception 'An active System Admin with invitation permission is required'
      using errcode='42501';
  end if;
  if exists (select 1 from auth.users u where lower(btrim(u.email)) = v_email) then
    raise exception 'An account already exists for this email. This invitation flow currently requires a new email address.'
      using errcode='23505';
  end if;

  insert into private.platform_admin_invitations
    (email, name, access_level, invited_by, invited_user_id, status, created_at, sent_at, expires_at, accepted_at)
  values (v_email, v_name, p_access_level, p_invited_by, null, 'pending', now(), null, now() + interval '7 days', null)
  on conflict (email) do update
    set name = excluded.name, access_level = excluded.access_level, invited_by = excluded.invited_by,
        invited_user_id = null, status = 'pending', created_at = now(), sent_at = null,
        expires_at = now() + interval '7 days', accepted_at = null
    where private.platform_admin_invitations.status in ('pending','sent','expired','revoked');

  select i.id into v_id from private.platform_admin_invitations i
  where i.email = v_email and i.status = 'pending';
  if v_id is null then
    raise exception 'An invitation for this email cannot be replaced' using errcode='23505';
  end if;
  return v_id;
end;
$function$;

create or replace function public.system_admin_invitation_finalize_for_service(p_invitation_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare v_email text;
begin
  -- An invited Auth user is not necessarily marked email-confirmed until the invite URL is consumed.
  select lower(btrim(u.email)) into v_email from auth.users u where u.id = p_user_id;
  if v_email is null then raise exception 'Invited Auth account was not created' using errcode='42501'; end if;
  update private.platform_admin_invitations i
  set invited_user_id = p_user_id, status = 'sent', sent_at = now(), expires_at = now() + interval '7 days'
  where i.id = p_invitation_id and i.email = v_email and i.status = 'pending';
  return found;
end;
$function$;

create or replace function public.system_admin_invitation_candidate_for_service(p_user_id uuid, p_email text)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select p_user_id is not null and p_email is not null and lower(btrim(p_email)) = p_email
    and exists (
      select 1 from auth.users u
      join private.platform_admin_invitations i on i.email = lower(btrim(u.email))
      where u.id = p_user_id and lower(btrim(u.email)) = p_email and u.email_confirmed_at is not null
        and i.status = 'sent' and (i.invited_user_id is null or i.invited_user_id = p_user_id)
        and i.expires_at > now()
    );
$function$;

create or replace function public.is_system_admin_invitation_candidate()
returns boolean language sql stable security definer set search_path = ''
as $function$
  select (select auth.uid()) is not null and exists (
    select 1 from auth.users u
    join private.platform_admin_invitations i on i.email = lower(btrim(u.email))
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
      and i.status = 'sent' and (i.invited_user_id is null or i.invited_user_id = u.id)
      and i.expires_at > now()
  );
$function$;

create or replace function public.current_system_admin_invitation_access_level()
returns text language sql stable security definer set search_path = ''
as $function$
  select i.access_level from private.platform_admin_invitations i
  join auth.users u on u.id = (select auth.uid())
  where i.email = lower(btrim(u.email)) and u.email_confirmed_at is not null
    and i.status = 'sent' and (i.invited_user_id is null or i.invited_user_id = u.id)
    and i.expires_at > now()
  order by i.created_at desc limit 1;
$function$;

create or replace function public.claim_system_admin_invitation()
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_email text;
  v_invite uuid;
  v_access_level text;
begin
  if v_user is null or not private.privileged_session_verified() then
    raise exception 'MFA-verified sign-in required' using errcode='42501';
  end if;
  select lower(btrim(u.email)) into v_email from auth.users u
  where u.id = v_user and u.email_confirmed_at is not null;
  if v_email is null then raise exception 'A verified invited email is required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(82642,1002);
  select i.id, i.access_level into v_invite, v_access_level
  from private.platform_admin_invitations i
  where i.email = v_email and i.status = 'sent'
    and (i.invited_user_id is null or i.invited_user_id = v_user) and i.expires_at > now()
  order by i.created_at desc limit 1 for update;
  if v_invite is null then
    raise exception 'No valid System Admin invitation was found for this account' using errcode='42501';
  end if;
  insert into public.platform_admins(user_id, is_active, access_level) values (v_user, true, v_access_level);
  update private.platform_admin_invitations
    set invited_user_id = v_user, status = 'accepted', accepted_at = now() where id = v_invite;
  return true;
end;
$function$;

create or replace function public.current_system_admin_access_level()
returns text language sql stable security definer set search_path = ''
as $function$
  select a.access_level from public.platform_admins a
  where a.user_id = (select auth.uid()) and a.is_active and private.privileged_session_verified()
  limit 1;
$function$;

create or replace function private.claim_initial_admin_bootstrap()
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_verified timestamptz;
  v_invite uuid;
begin
  if v_user is null or not private.privileged_session_verified() then
    raise exception 'MFA-verified sign-in required' using errcode='42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(82642,1001);
  if exists (select 1 from public.platform_admins) then
    raise exception 'Initial admin already activated' using errcode='42501';
  end if;
  select lower(btrim(u.email)), u.email_confirmed_at into v_email, v_verified
  from auth.users u where u.id = v_user;
  if v_email is null or v_verified is null then
    raise exception 'Verified invited email required' using errcode='42501';
  end if;
  select i.id into v_invite from private.platform_admin_bootstrap_invites i
  where i.email = v_email and i.claimed_user_id is null and i.expires_at > now() for update;
  if v_invite is null then
    raise exception 'No valid bootstrap invitation for this account' using errcode='42501';
  end if;
  insert into public.platform_admins(user_id, is_active, access_level) values (v_user, true, 'owner');
  update private.platform_admin_bootstrap_invites set claimed_user_id = v_user, claimed_at = now() where id = v_invite;
  return true;
end;
$function$;

create or replace function public.system_admin_get_administrators()
returns table (
  id uuid, admin_user_id uuid, email text, name text, access_level text, is_active boolean,
  status text, granted_by uuid, granted_by_email text, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = ''
as $function$
  select a.user_id, a.user_id, u.email,
    coalesce(nullif(i.name, ''), nullif(u.raw_user_meta_data ->> 'name', ''), nullif(u.raw_user_meta_data ->> 'full_name', '')),
    a.access_level, a.is_active, case when a.is_active then 'active' else 'revoked' end,
    i.invited_by, inviter.email, a.created_at, a.created_at
  from public.platform_admins a
  join auth.users u on u.id = a.user_id
  left join private.platform_admin_invitations i on i.invited_user_id = a.user_id and i.status = 'accepted'
  left join auth.users inviter on inviter.id = i.invited_by
  where private.privileged_session_verified()
    and exists (select 1 from public.platform_admins caller where caller.user_id = (select auth.uid())
                and caller.is_active and caller.access_level in ('owner', 'administrator'))
  union all
  select i.id, i.invited_user_id, i.email, i.name, i.access_level, false, 'pending',
    i.invited_by, inviter.email, i.created_at, i.created_at
  from private.platform_admin_invitations i
  join auth.users invitee on invitee.id = i.invited_user_id
  left join auth.users inviter on inviter.id = i.invited_by
  where i.status = 'sent' and i.expires_at > now() and private.privileged_session_verified()
    and exists (select 1 from public.platform_admins caller where caller.user_id = (select auth.uid())
                and caller.is_active and caller.access_level in ('owner', 'administrator'));
$function$;

revoke all on function public.system_admin_invitation_prepare_for_service(text,text,text,uuid) from public, anon, authenticated;
revoke all on function public.system_admin_invitation_finalize_for_service(uuid,uuid) from public, anon, authenticated;
revoke all on function public.system_admin_invitation_candidate_for_service(uuid,text) from public, anon, authenticated;
grant execute on function public.system_admin_invitation_prepare_for_service(text,text,text,uuid) to service_role;
grant execute on function public.system_admin_invitation_finalize_for_service(uuid,uuid) to service_role;
grant execute on function public.system_admin_invitation_candidate_for_service(uuid,text) to service_role;

revoke all on function public.is_system_admin_invitation_candidate() from public, anon;
grant execute on function public.is_system_admin_invitation_candidate() to authenticated, service_role;
revoke all on function public.current_system_admin_invitation_access_level() from public, anon;
grant execute on function public.current_system_admin_invitation_access_level() to authenticated, service_role;
revoke all on function public.claim_system_admin_invitation() from public, anon;
grant execute on function public.claim_system_admin_invitation() to authenticated, service_role;
revoke all on function public.current_system_admin_access_level() from public, anon;
grant execute on function public.current_system_admin_access_level() to authenticated, service_role;
revoke all on function public.system_admin_get_administrators() from public, anon;
grant execute on function public.system_admin_get_administrators() to authenticated, service_role;
