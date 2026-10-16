import { supabase } from '../../../lib/supabase';

export type SystemAdminAccessLevel = 'owner' | 'administrator' | 'view_only';

/** Resolve the current user's active System Admin access from the database. */
export async function fetchMySystemAdminAccessLevel(): Promise<SystemAdminAccessLevel | null> {
  const { data, error } = await supabase.rpc('system_admin_get_my_access_level');
  if (error) return null;

  const access = Array.isArray(data) ? data[0] : data;
  const level = access?.access_level as SystemAdminAccessLevel | undefined;
  if (
    !level ||
    access.is_active !== true ||
    access.status !== 'active'
  ) {
    return null;
  }

  return level;
}
