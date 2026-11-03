import { supabase } from '../../../lib/supabase';
import type { Restaurant } from '../types';

type TenantRow = { id:string; slug:string; name:string; status:string; created_at:string };
type StorefrontRow = { tenant_id:string; display_name:string|null; tagline:string|null; restaurant_address:string|null; store_address:string|null };
type DomainRow = { tenant_id:string; hostname:string; status:string; kind:string };

function mapTenant(t:TenantRow, storefront?:StorefrontRow, domain?:DomainRow, ownerEmail?:string|null):Restaurant {
  return {
    id:t.id,
    owner_id:null,
    custom_domain:domain?.hostname ?? 'app.web2table.io',
    slug:t.slug,
    name:storefront?.display_name?.trim() || t.name,
    tagline:storefront?.tagline ?? '',
    logo_url:null,
    restaurant_address:storefront?.restaurant_address || storefront?.store_address || null,
    contact_number:null,
    email:ownerEmail || null,
    is_active:t.status==='active',
    created_at:t.created_at,
    updated_at:t.created_at,
  };
}

async function hydrateRestaurants(rows:TenantRow[]) {
  if (!rows.length) return [];
  const ids=rows.map(row=>row.id);
  const [storefrontsResult,domainsResult,ownersResult]=await Promise.all([
    supabase.from('tenant_storefronts').select('tenant_id,display_name,tagline,restaurant_address,store_address').in('tenant_id',ids),
    supabase.from('tenant_domains').select('tenant_id,hostname,status,kind').in('tenant_id',ids).eq('kind','custom').order('created_at',{ascending:false}),
    Promise.all(rows.map(async row => {
      const {data}=await supabase.rpc('system_admin_get_restaurant_owner',{p_restaurant_id:row.id});
      const owner=Array.isArray(data)?data[0]:data;
      return [row.id, owner?.email ?? null] as const;
    })),
  ]);
  const storefrontByTenant=new Map((storefrontsResult.data??[]).map(item=>[item.tenant_id,item as StorefrontRow]));
  const domainByTenant=new Map<string,DomainRow>();
  for (const item of domainsResult.data??[]) {
    const domain=item as DomainRow;
    if (!domainByTenant.has(domain.tenant_id) && domain.status==='active') domainByTenant.set(domain.tenant_id,domain);
  }
  const ownerByTenant=new Map(ownersResult);
  return rows.map(row=>mapTenant(row,storefrontByTenant.get(row.id),domainByTenant.get(row.id),ownerByTenant.get(row.id)));
}

/** Restaurant directory enriched with persisted storefront, owner, and domain details. */
export async function fetchRestaurants() {
  const {data,error}=await supabase.from('tenants')
    .select('id,slug,name,status,created_at').order('created_at',{ascending:false});
  if (error) return {data:[],error};
  return {data:await hydrateRestaurants((data??[]) as TenantRow[]),error:null};
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
  const {data,error}=await supabase.from('tenants')
    .select('id,slug,name,status,created_at').eq('id',restaurantId).single();
  if (error || !data) return {data:null,error};
  const [restaurant]=await hydrateRestaurants([data as TenantRow]);
  return {data:restaurant,error:null};
}
