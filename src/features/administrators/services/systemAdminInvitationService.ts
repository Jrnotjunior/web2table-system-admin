import { supabase } from '../../../lib/supabase';

/**
 * Preserve the original invitation password-setup screen. First-admin
 * activation is now managed by SystemAdminMfaGate after an MFA-verified
 * claim, rather than a legacy system_admin_* activation RPC.
 * This is an initial password setup, NOT a password-reset feature.
 */
export async function activateSystemAdminInvitation(password: string): Promise<{
  error: { message: string } | null;
}> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error };
  const { data: eligible, error: authorizationError } =
    await supabase.rpc('privileged_route_eligible', { p_workspace: 'admin' });
  if (authorizationError) return { error: authorizationError };
  if (eligible !== true) return { error: { message: 'Verified administrator access is required.' } };
  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) return { error: assuranceError };
  if (assurance.currentLevel !== 'aal2')
    return { error: { message: 'Complete authenticator verification before activating this account.' } };
  return { error: null };
}
