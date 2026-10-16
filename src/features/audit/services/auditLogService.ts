import { supabase } from '../../../lib/supabase';

type AuditLogQuery = {
  eventType: string | null;
  limit: number;
  offset: number;
  search: string | null;
  startDate: string | null;
  endDate: string | null;
};

export async function fetchAuditLogs(query: AuditLogQuery) {
  return supabase.rpc('system_admin_get_audit_logs', {
    p_restaurant_id: null,
    p_event_type: query.eventType,
    p_limit: query.limit,
    p_offset: query.offset,
    p_search: query.search,
    p_start_date: query.startDate,
    p_end_date: query.endDate,
  });
}
