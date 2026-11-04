import { supabase } from '../../../lib/supabase';

export type AdminBranch = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  hasDeliveryLocation: boolean;
  hasPickupAddress: boolean;
};

export async function fetchAdminBranches(tenantId: string) {
  const { data, error } = await supabase.rpc('system_admin_list_branches', { p_tenant_id: tenantId });
  if (error) return { data: null, error };
  if (!Array.isArray(data)) return { data: null, error: new Error('The branch list response was invalid.') };
  const branches = data.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map(row => ({
      id: String(row.id ?? ''), slug: String(row.slug ?? ''), name: String(row.name ?? ''),
      isActive: row.isActive === true, isDefault: row.isDefault === true,
      hasDeliveryLocation: row.hasDeliveryLocation === true,
      hasPickupAddress: row.hasPickupAddress === true,
    } satisfies AdminBranch));
  return { data: branches, error: null };
}

export async function createAdminBranch(tenantId: string, slug: string, name: string) {
  return supabase.rpc('system_admin_create_branch', { p_tenant_id: tenantId, p_slug: slug, p_name: name });
}

export async function updateAdminBranch(tenantId: string, branchId: string, name: string, active: boolean) {
  return supabase.rpc('system_admin_update_branch', {
    p_tenant_id: tenantId, p_branch_id: branchId, p_name: name, p_active: active,
  });
}

export async function editAdminBranch(tenantId: string, branchId: string, slug: string, name: string) {
  return supabase.rpc('system_admin_edit_branch', {
    p_tenant_id: tenantId, p_branch_id: branchId, p_slug: slug, p_name: name,
  });
}
