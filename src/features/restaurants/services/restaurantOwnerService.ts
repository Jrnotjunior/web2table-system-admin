import { supabase } from '../../../lib/supabase';

export async function fetchRestaurantOwner(restaurantId: string) {
  return supabase.rpc('system_admin_get_restaurant_owner', {
    p_restaurant_id: restaurantId,
  });
}

export async function assignRestaurantOwner(restaurantId: string, email: string) {
  return supabase.rpc('system_admin_assign_restaurant_owner', {
    p_restaurant_id: restaurantId,
    p_email: email,
  });
}

export async function removeRestaurantOwner(restaurantId: string) {
  return supabase.rpc('system_admin_remove_restaurant_owner', {
    p_restaurant_id: restaurantId,
  });
}
