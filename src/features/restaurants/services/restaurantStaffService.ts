import { supabase } from '../../../lib/supabase';

export async function fetchRestaurantStaff(restaurantId: string) {
  return supabase.rpc('system_admin_get_restaurant_staff', {
    p_restaurant_id: restaurantId,
  });
}

export async function setRestaurantStaffActive(staffId: string, isActive: boolean) {
  return supabase.rpc('system_admin_set_restaurant_staff_active', {
    p_staff_id: staffId,
    p_is_active: isActive,
  });
}

/** Delete restaurant staff through the trusted system-admin Edge Function. */
export async function deleteRestaurantStaff(staffId: string): Promise<{
  data: { error?: unknown } | null;
  error: { message: string } | null;
}> {
  const { data, error } = await supabase.functions.invoke('system-admin-delete-staff', {
    body: { staffId },
  });

  if (!error) return { data, error: null };

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
    // Preserve the original FunctionsHttpError message when its response cannot be parsed.
  }

  return { data: null, error: { message } };
}
