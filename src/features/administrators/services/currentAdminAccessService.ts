import { supabase } from '../../../lib/supabase';

export type SystemAdminAccessLevel = 'owner' | 'administrator' | 'view_only';

/**
 * Resolve active platform administrator privileges from the CURRENT
 * Web2Table project. Legacy system_admin_* functions no longer exist.
 * The first verified MFA administrator maps to the original UI's owner
 * access level. The original UI remains unchanged.
 */
export async function fetchMySystemAdminAccessLevel(): Promise<SystemAdminAccessLevel | null> {
  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || aal.currentLevel !== 'aal2') return null;

  const { data: accessLevel, error } = await supabase.rpc('current_system_admin_access_level');
  if (error || (accessLevel !== 'owner' && accessLevel !== 'administrator' && accessLevel !== 'view_only')) {
    return null;
  }
  return accessLevel;
}
