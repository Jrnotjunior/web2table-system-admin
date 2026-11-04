-- Store administrator invitation names as separate fields while retaining
-- the legacy combined name for existing UI and audit compatibility.
ALTER TABLE private.platform_admin_invitations
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

UPDATE private.platform_admin_invitations
SET first_name = coalesce(nullif(first_name,''), split_part(name,' ',1)),
    last_name = coalesce(nullif(last_name,''), coalesce(nullif(btrim(substr(name, length(split_part(name,' ',1))+1)), ''), 'Unknown'))
WHERE first_name IS NULL OR last_name IS NULL;

ALTER TABLE private.platform_admin_invitations
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

ALTER TABLE private.platform_admin_invitations
  ADD CONSTRAINT platform_admin_invitations_first_name_length
    CHECK (length(btrim(first_name)) BETWEEN 1 AND 60),
  ADD CONSTRAINT platform_admin_invitations_last_name_length
    CHECK (length(btrim(last_name)) BETWEEN 1 AND 60);

CREATE OR REPLACE FUNCTION public.system_admin_invitation_prepare_with_names_for_service(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_access_level text,
  p_invited_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_id uuid;
  v_first text := btrim(coalesce(p_first_name,''));
  v_last text := btrim(coalesce(p_last_name,''));
BEGIN
  IF length(v_first) NOT BETWEEN 1 AND 60 OR length(v_last) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'First name and last name must each be between 1 and 60 characters'
      USING ERRCODE='22023';
  END IF;

  v_id := public.system_admin_invitation_prepare_for_service(
    p_email,
    v_first || ' ' || v_last,
    p_access_level,
    p_invited_by
  );

  UPDATE private.platform_admin_invitations
  SET first_name = v_first, last_name = v_last, name = v_first || ' ' || v_last
  WHERE id = v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.system_admin_invitation_prepare_with_names_for_service(text,text,text,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_admin_invitation_prepare_with_names_for_service(text,text,text,text,uuid)
  TO service_role;

NOTIFY pgrst, 'reload schema';
