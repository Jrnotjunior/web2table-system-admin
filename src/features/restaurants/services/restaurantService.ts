import { supabase } from '../../../lib/supabase';

export async function fetchRestaurants() {
  return supabase
    .from('restaurants')
    .select('id,owner_id,custom_domain,slug,name,tagline,logo_url,location_text,contact_number,email,is_active,created_at,updated_at')
    .order('created_at', { ascending: false });
}
