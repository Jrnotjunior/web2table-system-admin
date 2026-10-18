import { supabase } from '../../../lib/supabase';

export async function fetchRestaurants() {
  return supabase
    .from('restaurants')
    .select('id,owner_id,custom_domain,slug,name,tagline,logo_url,restaurant_address,contact_number,email,is_active,created_at,updated_at')
    .order('created_at', { ascending: false });
}

/** Delete a restaurant through the trusted system-admin Edge Function. */
export async function deleteRestaurant(restaurantId: string): Promise<{
  data: { error?: unknown } | null;
  error: { message: string } | null;
}> {
  const { data, error } = await supabase.functions.invoke('system-admin-delete-restaurant', {
    body: { restaurant_id: restaurantId },
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
    // Keep the original FunctionsHttpError message if the response body cannot be parsed.
  }

  return { data: null, error: { message } };
}

/** Fetch the current persisted restaurant record after a status change. */
export async function fetchRestaurantById(restaurantId: string) {
  return supabase
    .from('restaurants')
    .select('id,owner_id,custom_domain,slug,name,tagline,logo_url,restaurant_address,contact_number,email,is_active,created_at,updated_at')
    .eq('id', restaurantId)
    .single();
}
