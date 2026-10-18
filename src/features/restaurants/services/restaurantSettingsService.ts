import { supabase } from '../../../lib/supabase';

export type RestaurantSettingsUpdate = {
  cashOnDeliveryEnabled: boolean;
  cashOnPickupEnabled: boolean;
  cashOnTakeOutEnabled: boolean;
  onlinePaymentEnabled: boolean;
  automaticRiderAssignmentEnabled: boolean;
  vatRegistered: boolean;
  pricesVatInclusive: boolean;
  vatRate: number;
};

export async function fetchRestaurantSettings(restaurantId: string) {
  return supabase.rpc('system_admin_get_restaurant_settings', {
    p_restaurant_id: restaurantId,
  });
}

export async function updateRestaurantSettings(
  restaurantId: string,
  settings: RestaurantSettingsUpdate,
) {
  return supabase.rpc('system_admin_update_restaurant_settings', {
    p_restaurant_id: restaurantId,
    p_cash_on_delivery_enabled: settings.cashOnDeliveryEnabled,
    p_cash_on_pickup_enabled: settings.cashOnPickupEnabled,
    p_cash_on_take_out_enabled: settings.cashOnTakeOutEnabled,
    p_online_payment_enabled: settings.onlinePaymentEnabled,
    p_automatic_rider_assignment_enabled: settings.automaticRiderAssignmentEnabled,
    p_tax_vat_registered: settings.vatRegistered,
    p_tax_prices_vat_inclusive: settings.pricesVatInclusive,
    p_tax_vat_rate: settings.vatRate,
  });
}
