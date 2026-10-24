import { supabase } from '../../../lib/supabase';

/**
 * Complete password setup from the verified email invitation session.
 * The trusted Edge Function validates the JWT, email verification, and
 * active-admin/bootstrap authorization before changing the password.
 */
export async function activateSystemAdminInvitation(password: string): Promise<{
  error: { message: string } | null;
}> {
  const { data: identity, error: userError } = await supabase.auth.getUser();
  if (userError || !identity.user) {
    return { error: { message: 'Open a new account setup email link first.' } };
  }

  const { data, error } = await supabase.functions.invoke('system-admin-activate-invitation', {
    body: { password },
  });

  if (error) {
    let message = error.message;
    try {
      const response = (error as { context?: Response }).context;
      if (response) {
        const responseBody = await response.clone().json() as { error?: unknown };
        if (typeof responseBody.error === 'string' && responseBody.error.trim()) {
          message = responseBody.error;
        }
      }
    } catch {
      // Preserve the original Functions error message if its response is not JSON.
    }
    return { error: { message } };
  }

  if (data?.error) {
    return { error: { message: String(data.error) } };
  }
  if (data?.success !== true) {
    return { error: { message: 'Password activation was not confirmed. Please request a fresh invitation.' } };
  }

  return { error: null };
}
