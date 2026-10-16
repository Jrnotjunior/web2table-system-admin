import { supabase } from '../../../lib/supabase';

export interface RestaurantProfilePayload {
  name: string;
  slug: string;
  tagline: string;
  logo_url: string | null;
  location_text: string | null;
  contact_number: string | null;
  email: string | null;
  is_active: boolean;
}

/** Persist a restaurant profile, returning its ID for the existing audit workflow. */
export async function saveRestaurantProfile(
  restaurantId: string | null,
  payload: RestaurantProfilePayload,
): Promise<{ id: string | null; error: { message: string } | null }> {
  if (restaurantId) {
    const { error } = await supabase
      .from('restaurants')
      .update(payload)
      .eq('id', restaurantId);

    return { id: error ? null : restaurantId, error };
  }

  const { data, error } = await supabase
    .from('restaurants')
    .insert(payload)
    .select('id')
    .single();

  return { id: data?.id ?? null, error };
}

/** Update only the active flag; audit recording and list refresh stay in the UI orchestration. */
export async function updateRestaurantActiveStatus(
  restaurantId: string,
  isActive: boolean,
) {
  return supabase
    .from('restaurants')
    .update({ is_active: isActive })
    .eq('id', restaurantId);
}
