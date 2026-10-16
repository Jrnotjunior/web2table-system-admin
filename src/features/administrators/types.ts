export type Administrator = {
  id: string;
  admin_user_id: string;
  email: string | null;
  name: string | null;
  access_level: 'owner' | 'administrator' | 'view_only';
  is_active: boolean;
  status: 'pending' | 'active' | 'revoked';
  granted_by: string | null;
  granted_by_email: string | null;
  created_at: string;
  updated_at: string;
};

export type PendingAdministratorAction = {
  type: 'revoke' | 'restore' | 'change' | 'delete';
  admin: Administrator;
  nextAccessLevel?: 'administrator' | 'view_only';
};
