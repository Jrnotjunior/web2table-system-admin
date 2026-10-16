export type AuditLog = {
  id: string;
  admin_user_id: string | null;
  admin_email: string | null;
  admin_name: string | null;
  restaurant_id: string | null;
  restaurant_name: string | null;
  event_type: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};
