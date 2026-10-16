import { supabase } from '../../../lib/supabase';

export type SystemAdminInviteAccessLevel = 'administrator' | 'view_only';

export interface InviteSystemAdministratorInput {
  email: string;
  accessLevel: SystemAdminInviteAccessLevel;
}

/** Send a System Admin invitation through the existing trusted Edge Function. */
export async function inviteSystemAdministrator(
  input: InviteSystemAdministratorInput,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('web2table-invite-user', {
    body: {
      invitation_type: 'system_admin',
      email: input.email,
      access_level: input.accessLevel,
    },
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
      // Preserve the original Functions error message when its response body cannot be parsed.
    }
    return { error: message };
  }

  if (data?.error) {
    return { error: String(data.error) };
  }

  return { error: null };
}
