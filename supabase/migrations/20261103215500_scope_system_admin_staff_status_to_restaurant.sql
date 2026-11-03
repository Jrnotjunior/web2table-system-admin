-- Prevent cross-tenant staff status changes when one user belongs to multiple restaurants.
DROP FUNCTION IF EXISTS public.system_admin_set_restaurant_staff_active(uuid,boolean);

CREATE OR REPLACE FUNCTION public.system_admin_set_restaurant_staff_active(
  p_restaurant_id uuid,
  p_staff_id uuid,
  p_is_active boolean
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_member public.tenant_memberships%ROWTYPE;
  v_new_status text := CASE WHEN p_is_active THEN 'active' ELSE 'disabled' END;
  v_email text;
BEGIN
  IF v_actor IS NULL OR NOT private.is_platform_admin() OR NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id=v_actor AND pa.is_active
      AND pa.access_level IN ('owner','administrator')
  ) THEN RAISE EXCEPTION 'Verified platform administrator with management access required' USING ERRCODE='42501'; END IF;
  IF p_restaurant_id IS NULL OR p_staff_id IS NULL OR p_is_active IS NULL THEN
    RAISE EXCEPTION 'Restaurant, staff account and target status are required' USING ERRCODE='22023';
  END IF;
  SELECT m.* INTO v_member FROM public.tenant_memberships m
  WHERE m.tenant_id=p_restaurant_id AND m.user_id=p_staff_id
    AND m.role IN ('cashier','kitchen','dispatcher','rider') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff account was not found for this restaurant' USING ERRCODE='P0002'; END IF;
  IF v_new_status='disabled' AND v_member.role='rider' AND EXISTS (
    SELECT 1 FROM public.delivery_assignments da
    WHERE da.tenant_id=p_restaurant_id AND da.rider_user_id=p_staff_id
      AND da.status IN ('assigned','accepted','out_for_delivery','arrived_at_customer')
  ) THEN RAISE EXCEPTION 'Reassign or complete this rider’s active deliveries before deactivation' USING ERRCODE='23514'; END IF;
  IF v_member.status IS DISTINCT FROM v_new_status THEN
    UPDATE public.tenant_memberships SET status=v_new_status,
      disabled_at=CASE WHEN p_is_active THEN NULL ELSE now() END
    WHERE tenant_id=p_restaurant_id AND user_id=p_staff_id;
    INSERT INTO public.tenant_staff_audit_events(tenant_id,target_user_id,actor_user_id,event_type,before_state,after_state)
    VALUES(p_restaurant_id,p_staff_id,v_actor,
      CASE WHEN p_is_active THEN 'reactivated' ELSE 'deactivated' END,
      jsonb_build_object('status',v_member.status),jsonb_build_object('status',v_new_status));
    SELECT u.email INTO v_email FROM auth.users u WHERE u.id=p_staff_id;
    PERFORM public.system_admin_write_audit_log(
      'restaurant_staff_status',
      CASE WHEN p_is_active THEN 'Activated restaurant staff account' ELSE 'Deactivated restaurant staff account' END,
      p_restaurant_id,'tenant_membership',p_staff_id::text,
      jsonb_build_object('email',v_email,'role',v_member.role,'previous_status',v_member.status,'status',v_new_status)
    );
  END IF;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.system_admin_set_restaurant_staff_active(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.system_admin_set_restaurant_staff_active(uuid,uuid,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
