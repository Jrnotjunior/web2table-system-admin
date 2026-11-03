import { supabase } from '../../../lib/supabase';
import type { Restaurant } from '../types';

type TenantRow = { id: string; slug: string; name: string; status: string; created_at: string };
type OverviewRow = {
  tagline: string | null;
  restaurant_address: string | null;
  store_address: string | null;
  custom_domain: string | null;
};

function mapTenant(t: TenantRow, overview?: OverviewRow, ownerEmail?: string | null): Restaurant {
  return {
    id: t.id,
    owner_id: null,
    custom_domain: overview?.custom_domain ?? 'app.web2table.io',
    slug: t.slug,
    name: t.name,
    tagline: overview?.tagline ?? '',
    logo_url: null,
    restaurant_address: overview?.restaurant_address || overview?.store_address || null,
    contact_number: null,
    email: ownerEmail || null,
    is_active: t.status === 'active',
    created_at: t.created_at,
    updated_at: t.created_at,
  };
}

async function hydrateRestaurants(rows: TenantRow[]) {
  if (!rows.length) return [];

  const hydrated = await Promise.all(rows.map(async (row) => {
    const [overviewResult, ownerResult] = await Promise.all([
      supabase.rpc('system_admin_get_restaurant_overview', { p_restaurant_id: row.id }),
      supabase.rpc('system_admin_get_restaurant_owner', { p_restaurant_id: row.id }),
    ]);

    if (overviewResult.error) throw overviewResult.error;
    if (ownerResult.error) throw ownerResult.error;

    const overview = Array.isArray(overviewResult.data)
      ? overviewResult.data[0]
      : overviewResult.data;
    const owner = Array.isArray(ownerResult.data)
      ? ownerResult.data[0]
      : ownerResult.data;

    return mapTenant(row, overview as OverviewRow | undefined, owner?.email ?? null);
  }));

  return hydrated;
}

/** Restaurant directory enriched through MFA-verified System Admin read RPCs. */
export async function fetchRestaurants() {
  const { data, error } = await supabase.from('tenants')
    .select('id,slug,name,status,created_at')
    .order('created_at', { ascending: false });

  if (error) return { data: [], error };

  try {
    return { data: await hydrateRestaurants((data ?? []) as TenantRow[]), error: null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unable to load restaurant overview details.';
    return { data: [], error: { message } };
  }
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
      if (typeof responseBody.error === 'string' && responseBody.error.trim()) message = responseBody.error;
    }
  } catch {
    // Preserve the original error when no structured response is available.
  }
  return { data: null, error: { message } };
}

/** Fetch the current persisted restaurant record after a status change. */
export async function fetchRestaurantById(restaurantId: string) {
  const { data, error } = await supabase.from('tenants')
    .select('id,slug,name,status,created_at')
    .eq('id', restaurantId)
    .single();

  if (error || !data) return { data: null, error };

  try {
    const [restaurant] = await hydrateRestaurants([data as TenantRow]);
    return { data: restaurant, error: null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unable to load restaurant overview details.';
    return { data: null, error: { message } };
  }
}
