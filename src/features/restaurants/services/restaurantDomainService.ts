import { supabase } from '../../../lib/supabase';

/** Set or clear a restaurant's custom domain through the authorized database RPC. */
export async function setRestaurantCustomDomain(
  restaurantId: string,
  customDomain: string,
) {
  return supabase.rpc('system_admin_set_restaurant_domain', {
    p_restaurant_id: restaurantId,
    p_custom_domain: customDomain,
  });
}
