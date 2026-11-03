import { supabase } from '../../../lib/supabase';

export interface RestaurantProfilePayload {
  name: string;
  slug: string;
  tagline: string;
  logo_url: string | null;
  restaurant_address: string | null;
  contact_number: string | null;
  email: string | null;
  is_active: boolean;
}

/** Legacy profile persistence is retained for callers outside the status workflow. */
export async function saveRestaurantProfile(
  restaurantId: string | null,
  payload: RestaurantProfilePayload,
): Promise<{ id: string | null; error: { message: string } | null }> {
  if (restaurantId) {
    const { error } = await supabase.from('restaurants').update(payload).eq('id', restaurantId);
    return { id: error ? null : restaurantId, error };
  }

  const { data, error } = await supabase.from('restaurants').insert(payload).select('id').single();
  return { id: data?.id ?? null, error };
}

/** Change tenant access through the MFA-verified System Admin RPC. */
export async function updateRestaurantActiveStatus(restaurantId: string, isActive: boolean) {
  const { data, error } = await supabase.rpc('system_admin_set_restaurant_status', {
    p_restaurant_id: restaurantId,
    p_is_active: isActive,
  });
  return { data, error };
}
