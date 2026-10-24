import { supabase } from '../../../lib/supabase';

/**
 * Initial password creation for the existing invited-account UI.
 * Session must be from the Supabase email link. Only the active platform
 * administrator or a verified initial bootstrap candidate may proceed.
 * Actual privileged operations still require AAL2 enforced by the backend.
 */
export async function activateSystemAdminInvitation(password: string): Promise<{
  error: { message: string } | null;
}> {
  const { data: identity, error: userError } = await supabase.auth.getUser();
  if (userError || !identity.user) {
    return { error: { message: 'Open a new account setup email link first.' } };
  }
  const { data: admin, error: adminError } = await supabase.rpc(
    'privileged_route_eligible', { p_workspace: 'admin' },
  );
  if (adminError) return { error: adminError };
  if (admin !== true) {
    const { data: candidate, error: candidateError } =
      await supabase.rpc('is_initial_admin_bootstrap_candidate');
    if (candidateError) return { error: candidateError };
    if (candidate !== true) {
      return { error: { message: 'Account is not authorized for System Admin setup.' } };
    }
  }
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ?? null };
}
