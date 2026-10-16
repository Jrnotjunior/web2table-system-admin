import { supabase } from '../../../lib/supabase';

export async function fetchAdministrators() {
  return supabase.rpc('system_admin_get_administrators');
}

export async function revokeAdministratorAccess(adminUserId: string) {
  return supabase.rpc('system_admin_revoke_access', {
    p_admin_user_id: adminUserId,
  });
}

export async function restoreAdministratorAccess(adminUserId: string) {
  return supabase.rpc('system_admin_restore_access', {
    p_admin_user_id: adminUserId,
  });
}

export async function deleteRevokedAdministratorAccess(adminUserId: string) {
  return supabase.rpc('system_admin_delete_revoked_access', {
    p_admin_user_id: adminUserId,
  });
}

export async function updateAdministratorAccessLevel(
  adminUserId: string,
  accessLevel: 'administrator' | 'view_only',
) {
  return supabase.rpc('system_admin_set_access_level', {
    p_admin_user_id: adminUserId,
    p_access_level: accessLevel,
  });
}
