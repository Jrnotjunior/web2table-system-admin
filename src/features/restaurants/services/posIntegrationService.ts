import { supabase } from '../../../lib/supabase';

export type PosIntegrationStatus = 'not_enabled' | 'pending' | 'active' | 'suspended' | 'revoked';
export type PosIntegrationAction = 'enable' | 'suspend' | 'revoke';

export async function fetchPosIntegrationStatus(tenantId: string): Promise<PosIntegrationStatus> {
  const { data, error } = await supabase.rpc('get_tenant_pos_integration', { p_tenant_id: tenantId });
  if (error) throw error;
  const status = (data as { status?: unknown } | null)?.status;
  if (typeof status !== 'string' || !['not_enabled','pending','active','suspended','revoked'].includes(status)) {
    throw new Error('Invalid POS integration status.');
  }
  return status as PosIntegrationStatus;
}

export async function updatePosIntegrationStatus(tenantId: string, action: PosIntegrationAction, reason = ''): Promise<PosIntegrationStatus> {
  if (reason.length > 500) throw new Error('Reason must be 500 characters or fewer.');
  const { data, error } = await supabase.rpc('set_tenant_pos_integration', {
    p_tenant_id: tenantId, p_action: action, p_reason: reason.trim() || null,
  });
  if (error) throw error;
  const status = (data as { status?: unknown } | null)?.status;
  if (typeof status !== 'string' || !['not_enabled','pending','active','suspended','revoked'].includes(status)) {
    throw new Error('Invalid POS integration update response.');
  }
  return status as PosIntegrationStatus;
}
