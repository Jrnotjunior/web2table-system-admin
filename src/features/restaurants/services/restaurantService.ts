import { supabase } from '../../../lib/supabase';
import type { Restaurant } from '../types';

type TenantRow = {id:string;slug:string;name:string;status:string;created_at:string};

/** Original System Admin restaurant list, backed by real Web2Table tenants.
 * RLS permits reading only for MFA-verified platform administrators.
 */
function mapTenant(t:TenantRow):Restaurant {
  return {
    id:t.id,owner_id:null,custom_domain:null,slug:t.slug,name:t.name,
    tagline:'',logo_url:null,restaurant_address:null,contact_number:null,
    email:null,is_active:t.status==='active',
    created_at:t.created_at,updated_at:t.created_at,
  };
}

export async function fetchRestaurants() {
  const {data,error}=await supabase.from('tenants')
    .select('id,slug,name,status,created_at').order('created_at',{ascending:false});
  return {data:(data??[]).map(t=>mapTenant(t as TenantRow)),error};
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
  const {data,error}=await supabase.from('tenants')
    .select('id,slug,name,status,created_at').eq('id',restaurantId).single();
  return {data:data?mapTenant(data as TenantRow):null,error};
}
