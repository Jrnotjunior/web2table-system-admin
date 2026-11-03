-- System Admin restaurant owner and staff management RPCs.
-- Mirrors the migration applied to the Web2Table Supabase project.

CREATE OR REPLACE FUNCTION public.system_admin_get_restaurant_staff(p_restaurant_id uuid)
RETURNS TABLE (id uuid, name text, mobile_number text, email text, role text, is_active boolean, auth_user_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT private.is_platform_admin() OR NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = (SELECT auth.uid()) AND pa.is_active
      AND pa.access_level IN ('owner','administrator','view_only')
  ) THEN
    RAISE EXCEPTION 'Verified System Administrator access required' USING ERRCODE='42501';
  END IF;
  IF p_restaurant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id=p_restaurant_id) THEN
    RAISE EXCEPTION 'Restaurant not found' USING ERRCODE='P0002';
  END IF;
  RETURN QUERY
  SELECT m.user_id,
    COALESCE(
      NULLIF(BTRIM(CONCAT_WS(' ',
        COALESCE(NULLIF(BTRIM(m.staff_first_name),''),NULLIF(BTRIM(u.raw_user_meta_data->>'first_name'),''),NULLIF(BTRIM(u.raw_user_meta_data->>'preferred_name'),'')),
        COALESCE(NULLIF(BTRIM(m.staff_last_name),''),NULLIF(BTRIM(u.raw_user_meta_data->>'last_name'),''))
      )), ''),
      NULLIF(BTRIM(u.raw_user_meta_data->>'full_name'),''),
      NULLIF(BTRIM(u.raw_user_meta_data->>'name'),''),
      INITCAP(REPLACE(m.role,'_',' '))
    ),
    COALESCE(NULLIF(BTRIM(m.staff_phone),''),NULLIF(BTRIM(u.phone),''),NULLIF(BTRIM(u.raw_user_meta_data->>'phone'),''),NULLIF(BTRIM(u.raw_user_meta_data->>'phone_number'),''),''),
    COALESCE(u.email,''),m.role,(m.status='active'),m.user_id
  FROM public.tenant_memberships m
  JOIN auth.users u ON u.id=m.user_id
  WHERE m.tenant_id=p_restaurant_id AND m.role IN ('cashier','kitchen','dispatcher','rider')
  ORDER BY m.created_at DESC,u.email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.system_admin_set_restaurant_staff_active(p_staff_id uuid,p_is_active boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_member public.tenant_memberships%ROWTYPE;
  v_status text := CASE WHEN p_is_active THEN 'active' ELSE 'disabled' END;
  v_email text;
BEGIN
  IF v_actor IS NULL OR NOT private.is_platform_admin() OR NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=v_actor AND pa.is_active
      AND pa.access_level IN ('owner','administrator')
  ) THEN RAISE EXCEPTION 'Verified platform administrator with management access required' USING ERRCODE='42501'; END IF;
  IF p_staff_id IS NULL OR p_is_active IS NULL THEN RAISE EXCEPTION 'Staff account and target status are required' USING ERRCODE='22023'; END IF;
  SELECT m.* INTO v_member FROM public.tenant_memberships m
  WHERE m.user_id=p_staff_id AND m.role IN ('cashier','kitchen','dispatcher','rider') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant staff account not found' USING ERRCODE='P0002'; END IF;
  IF v_status='disabled' AND v_member.role='rider' AND EXISTS (
    SELECT 1 FROM public.delivery_assignments da
    WHERE da.tenant_id=v_member.tenant_id AND da.rider_user_id=p_staff_id
      AND da.status IN ('assigned','accepted','out_for_delivery','arrived_at_customer')
  ) THEN RAISE EXCEPTION 'Reassign or complete this rider’s active deliveries before deactivation' USING ERRCODE='23514'; END IF;
  IF v_member.status IS DISTINCT FROM v_status THEN
    UPDATE public.tenant_memberships SET status=v_status,
      disabled_at=CASE WHEN p_is_active THEN NULL ELSE now() END
    WHERE tenant_id=v_member.tenant_id AND user_id=p_staff_id;
    INSERT INTO public.tenant_staff_audit_events(tenant_id,target_user_id,actor_user_id,event_type,before_state,after_state)
    VALUES(v_member.tenant_id,p_staff_id,v_actor,
      CASE WHEN p_is_active THEN 'reactivated' ELSE 'deactivated' END,
      jsonb_build_object('status',v_member.status),jsonb_build_object('status',v_status));
    SELECT u.email INTO v_email FROM auth.users u WHERE u.id=p_staff_id;
    PERFORM public.system_admin_write_audit_log(
      'restaurant_staff_status',
      CASE WHEN p_is_active THEN 'Activated restaurant staff account' ELSE 'Deactivated restaurant staff account' END,
      v_member.tenant_id,'tenant_membership',p_staff_id::text,
      jsonb_build_object('email',v_email,'role',v_member.role,'previous_status',v_member.status,'status',v_status)
    );
  END IF;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.system_admin_get_restaurant_owner(p_restaurant_id uuid)
RETURNS TABLE(user_id uuid,email text,full_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT private.is_platform_admin() OR NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=(SELECT auth.uid()) AND pa.is_active
      AND pa.access_level IN ('owner','administrator','view_only')
  ) THEN RAISE EXCEPTION 'Verified System Administrator access required' USING ERRCODE='42501'; END IF;
  IF p_restaurant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id=p_restaurant_id) THEN
    RAISE EXCEPTION 'Restaurant not found' USING ERRCODE='P0002';
  END IF;
  RETURN QUERY SELECT m.user_id,u.email,
    COALESCE(NULLIF(BTRIM(u.raw_user_meta_data->>'full_name'),''),NULLIF(BTRIM(u.raw_user_meta_data->>'name'),''),NULLIF(BTRIM(CONCAT_WS(' ',u.raw_user_meta_data->>'first_name',u.raw_user_meta_data->>'last_name')),''),u.email)
  FROM public.tenant_memberships m JOIN auth.users u ON u.id=m.user_id
  WHERE m.tenant_id=p_restaurant_id AND m.role='restaurant_owner' AND m.status='active'
  ORDER BY m.created_at LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.system_admin_assign_restaurant_owner(p_restaurant_id uuid,p_email text)
RETURNS TABLE(user_id uuid,email text,full_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_target uuid;
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_previous uuid;
  v_name text;
BEGIN
  IF v_actor IS NULL OR NOT private.is_platform_admin() OR NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=v_actor AND pa.is_active
      AND pa.access_level IN ('owner','administrator')
  ) THEN RAISE EXCEPTION 'Verified platform administrator with management access required' USING ERRCODE='42501'; END IF;
  IF p_restaurant_id IS NULL OR v_email='' THEN RAISE EXCEPTION 'Restaurant and owner email are required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id=p_restaurant_id) THEN RAISE EXCEPTION 'Restaurant not found' USING ERRCODE='P0002'; END IF;
  SELECT u.id,COALESCE(NULLIF(BTRIM(u.raw_user_meta_data->>'full_name'),''),NULLIF(BTRIM(u.raw_user_meta_data->>'name'),''),NULLIF(BTRIM(CONCAT_WS(' ',u.raw_user_meta_data->>'first_name',u.raw_user_meta_data->>'last_name')),''),u.email)
  INTO v_target,v_name FROM auth.users u WHERE lower(btrim(u.email))=v_email AND u.email_confirmed_at IS NOT NULL LIMIT 1;
  IF v_target IS NULL THEN RAISE EXCEPTION 'No auth account was found for this email' USING ERRCODE='P0002'; END IF;
  PERFORM 1 FROM public.tenants t WHERE t.id=p_restaurant_id FOR UPDATE;
  SELECT m.user_id INTO v_previous FROM public.tenant_memberships m
  WHERE m.tenant_id=p_restaurant_id AND m.role='restaurant_owner' FOR UPDATE;
  IF v_previous IS NOT NULL AND v_previous<>v_target THEN
    DELETE FROM public.tenant_memberships WHERE tenant_id=p_restaurant_id AND user_id=v_previous AND role='restaurant_owner';
  END IF;
  INSERT INTO public.tenant_memberships(tenant_id,user_id,role,status,disabled_at)
  VALUES(p_restaurant_id,v_target,'restaurant_owner','active',NULL)
  ON CONFLICT(tenant_id,user_id) DO UPDATE SET role='restaurant_owner',status='active',disabled_at=NULL;
  PERFORM public.system_admin_write_audit_log('restaurant_owner_assignment','Assigned restaurant owner',p_restaurant_id,
    'tenant_membership',v_target::text,jsonb_build_object('email',v_email,'previous_owner_user_id',v_previous,'owner_user_id',v_target));
  RETURN QUERY SELECT v_target,v_email,v_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.system_admin_remove_restaurant_owner(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_owner uuid;
  v_email text;
BEGIN
  IF v_actor IS NULL OR NOT private.is_platform_admin() OR NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=v_actor AND pa.is_active
      AND pa.access_level IN ('owner','administrator')
  ) THEN RAISE EXCEPTION 'Verified platform administrator with management access required' USING ERRCODE='42501'; END IF;
  IF p_restaurant_id IS NULL THEN RAISE EXCEPTION 'Restaurant is required' USING ERRCODE='22023'; END IF;
  SELECT m.user_id INTO v_owner FROM public.tenant_memberships m
  WHERE m.tenant_id=p_restaurant_id AND m.role='restaurant_owner' FOR UPDATE;
  IF v_owner IS NULL THEN RETURN true; END IF;
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id=v_owner;
  DELETE FROM public.tenant_memberships WHERE tenant_id=p_restaurant_id AND user_id=v_owner AND role='restaurant_owner';
  PERFORM public.system_admin_write_audit_log('restaurant_owner_assignment','Removed restaurant owner',p_restaurant_id,
    'tenant_membership',v_owner::text,jsonb_build_object('email',v_email,'owner_user_id',v_owner));
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.system_admin_get_restaurant_staff(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.system_admin_set_restaurant_staff_active(uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.system_admin_get_restaurant_owner(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.system_admin_assign_restaurant_owner(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.system_admin_remove_restaurant_owner(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.system_admin_get_restaurant_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.system_admin_set_restaurant_staff_active(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.system_admin_get_restaurant_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.system_admin_assign_restaurant_owner(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.system_admin_remove_restaurant_owner(uuid) TO authenticated;

NOTIFY pgrst,'reload schema';
