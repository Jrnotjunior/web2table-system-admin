import { supabase } from '../../lib/supabase';

export async function recordAuthAuditEvent(
  eventType: 'LOGIN_SUCCESS' | 'LOGOUT',
  action: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await supabase.rpc('system_admin_record_auth_event', {
    p_event_type: eventType,
    p_action: action,
    p_details: details,
  });

  if (error) {
    console.error('Unable to record System Administrator audit event:', error);
  }
}

export async function recordAdminAudit(
  action: string,
  restaurantId: string | null,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  const { error } = await supabase.rpc('system_admin_write_audit_log', {
    p_event_type: 'ADMIN_ACTION',
    p_action: action,
    p_restaurant_id: restaurantId,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_details: details,
  });

  if (error) {
    console.error('Unable to record System Administrator audit event:', error);
  }
}
