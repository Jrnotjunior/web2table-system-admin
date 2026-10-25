import { supabase } from '../../../lib/supabase';
import type { TotpResetAccount } from '../types';

type ManagementResponse = { accounts?: TotpResetAccount[]; error?: string };

async function invokeManagement(body: Record<string, unknown>): Promise<ManagementResponse> {
  const { data, error } = await supabase.functions.invoke('system-admin-totp-management', { body });
  if (error) {
    let message = error.message;
    try {
      const response = (error as { context?: Response }).context;
      if (response) {
        const payload = await response.clone().json() as { error?: unknown };
        if (typeof payload.error === 'string' && payload.error.trim()) message = payload.error;
      }
    } catch { /* Keep the original Functions error. */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as ManagementResponse;
}

export async function fetchTotpResetAccounts(): Promise<TotpResetAccount[]> {
  const data = await invokeManagement({ action: 'list' });
  if (!Array.isArray(data.accounts)) throw new Error('The server returned an invalid account list.');
  return data.accounts;
}

export async function resetRestaurantUserTotp(
  targetUserId: string,
  restaurantId: string,
  role: 'restaurant_owner' | 'staff' | 'system_admin',
): Promise<void> {
  await invokeManagement({
    action: 'reset',
    target_user_id: targetUserId,
    restaurant_id: restaurantId || null,
    target_role: role,
  });
}
