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

/** Send a restaurant-owner invitation through the trusted invitation Edge Function. */
export async function inviteRestaurantOwner(restaurantId: string, email: string) {
  return supabase.functions.invoke('web2table-invite-user', {
    body: {
      email,
      invitation_type: 'restaurant_owner',
      restaurant_id: restaurantId,
    },
  });
}
