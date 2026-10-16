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
