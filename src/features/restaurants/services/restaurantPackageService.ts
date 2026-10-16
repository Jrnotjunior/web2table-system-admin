import { supabase } from '../../../lib/supabase';

export async function fetchRestaurantPackage(restaurantId: string) {
  return supabase.rpc('system_admin_get_restaurant_package', {
    p_restaurant_id: restaurantId,
  });
}

export async function assignRestaurantPackage(restaurantId: string, packageId: number) {
  return supabase.rpc('system_admin_assign_restaurant_package', {
    p_restaurant_id: restaurantId,
    p_package_id: packageId,
  });
}

export async function setRestaurantModuleOverride(
  restaurantId: string,
  moduleKey: string,
  enabled: boolean,
) {
  return supabase.rpc('system_admin_set_restaurant_module_override', {
    p_restaurant_id: restaurantId,
    p_module_key: moduleKey,
    p_enabled: enabled,
  });
}
