import { supabase } from '../../../lib/supabase';

export interface InviteRestaurantTenantInput {
  email: string;
  ownerName: string;
  name: string;
  slug: string;
  packageId: number;
}

/** Create a tenant and send its owner invitation through the trusted Edge Function. */
export async function inviteRestaurantTenant(
  input: InviteRestaurantTenantInput,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('system-admin-invite-tenant', {
    body: {
      email: input.email,
      owner_name: input.ownerName,
      name: input.name,
      slug: input.slug,
      package_id: input.packageId,
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
      // Keep the original Functions error message if the response body cannot be parsed.
    }
    return { error: message };
  }

  if (data?.error) {
    return { error: String(data.error) };
  }

  return { error: null };
}
