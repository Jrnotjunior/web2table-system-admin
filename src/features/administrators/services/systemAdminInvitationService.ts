import { supabase } from '../../../lib/supabase';

/** Set the invited administrator's password, then activate their pending access. */
export async function activateSystemAdminInvitation(password: string): Promise<{
  error: { message: string } | null;
}> {
  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) return { error: passwordError };

  const { error: activationError } = await supabase.rpc(
    'system_admin_activate_my_pending_access',
  );
  if (activationError) return { error: activationError };

  return { error: null };
}
