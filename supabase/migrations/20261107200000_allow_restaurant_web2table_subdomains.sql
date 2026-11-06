-- Allow restaurant-specific Web2Table subdomains while reserving platform services.
-- Domain activation still requires the existing DNS verification workflow.
CREATE OR REPLACE FUNCTION public.system_admin_set_restaurant_domain(
  p_restaurant_id uuid, p_custom_domain text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_hostname text := lower(btrim(coalesce(p_custom_domain,'')));
  v_domain_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT private.privileged_session_verified()
    OR NOT private.is_platform_admin()
    OR NOT EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id=v_actor AND pa.is_active
        AND pa.access_level IN ('owner','administrator')
    ) THEN
    RAISE EXCEPTION 'MFA-verified Owner or Administrator session required' USING ERRCODE='42501';
  END IF;
  IF p_restaurant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id=p_restaurant_id) THEN
    RAISE EXCEPTION 'Restaurant not found' USING ERRCODE='P0002';
  END IF;
  IF v_hostname='' THEN
    UPDATE public.tenant_domains SET status='disabled'
    WHERE tenant_id=p_restaurant_id AND kind='custom' AND status<>'disabled';
    PERFORM public.system_admin_write_audit_log(
      'restaurant_domain','Removed custom restaurant domain',p_restaurant_id,
      'tenant_domain',p_restaurant_id::text,jsonb_build_object('action','disabled')
    );
    RETURN '';
  END IF;
  IF char_length(v_hostname)>253
    OR v_hostname !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?([.][a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    OR v_hostname='web2table.io'
    OR (v_hostname LIKE '%.web2table.io'
      AND (
        v_hostname !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?[.]web2table[.]io$'
        OR split_part(v_hostname,'.',1) IN ('app','admin','tickets','www','api','auth','mail','email','smtp','ftp','cdn','assets','static','maps','status','support','billing','dashboard','system','internal','dev','staging','test')
      )
    ) THEN
    RAISE EXCEPTION 'Enter a valid restaurant hostname. Reserved Web2Table hostnames are not allowed.' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenant_domains d WHERE d.hostname=v_hostname AND d.tenant_id<>p_restaurant_id) THEN
    RAISE EXCEPTION 'This domain is already assigned to another restaurant.' USING ERRCODE='23505';
  END IF;
  SELECT d.id INTO v_domain_id FROM public.tenant_domains d
  WHERE d.tenant_id=p_restaurant_id AND d.hostname=v_hostname FOR UPDATE;
  IF v_domain_id IS NULL THEN
    INSERT INTO public.tenant_domains(tenant_id,hostname,kind,status)
    VALUES(p_restaurant_id,v_hostname,'custom','pending') RETURNING id INTO v_domain_id;
  ELSE
    IF EXISTS (SELECT 1 FROM public.tenant_domains d WHERE d.id=v_domain_id AND d.kind='managed') THEN
      RAISE EXCEPTION 'A managed platform domain cannot be reassigned as a custom domain.' USING ERRCODE='42501';
    END IF;
    UPDATE public.tenant_domains SET kind='custom',
      status=CASE WHEN verified_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
      activated_at=NULL WHERE id=v_domain_id;
  END IF;
  PERFORM public.system_admin_write_audit_log(
    'restaurant_domain','Requested custom restaurant domain',p_restaurant_id,
    'tenant_domain',v_domain_id::text,
    jsonb_build_object('hostname',v_hostname,'status','pending_verification')
  );
  RETURN v_hostname;
END;
$function$;
REVOKE ALL ON FUNCTION public.system_admin_set_restaurant_domain(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.system_admin_set_restaurant_domain(uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
