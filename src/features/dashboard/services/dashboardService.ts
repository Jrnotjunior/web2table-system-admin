import { supabase } from '../../../lib/supabase';

export async function fetchDashboardData() {
  return Promise.all([
    supabase.rpc('system_admin_get_dashboard_summary'),
    supabase.rpc('system_admin_get_restaurant_monitoring'),
    supabase.rpc('system_admin_get_audit_logs', {
      p_restaurant_id: null,
      p_event_type: null,
      p_limit: 6,
      p_offset: 0,
      p_search: null,
      p_start_date: null,
      p_end_date: null,
    }),
    supabase.functions.invoke('system-admin-platform-health', { body: {} }),
  ]);
}
