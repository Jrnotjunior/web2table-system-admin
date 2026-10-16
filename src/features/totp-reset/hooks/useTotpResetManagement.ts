import { useState, type Dispatch, type SetStateAction } from 'react';
import { recordAdminAudit } from '../../../shared/services/auditService';
import { resetRestaurantUserTotp as resetRestaurantUserTotpService, resetCoAdministratorTotp, fetchTotpResetAccounts } from '../services/totpResetService';
import { fetchAdministrators } from '../../administrators/services/administratorService';
import type { PendingTotpReset, TotpResetAccount } from '../types';

type AccessLevel = 'owner' | 'administrator' | 'view_only' | null;
type Props = {
  adminAccessLevel: AccessLevel;
  setStaffActionId: Dispatch<SetStateAction<string | null>>;
  setStaffActionError: Dispatch<SetStateAction<string>>;
  setOwnerError: Dispatch<SetStateAction<string>>;
};

export function useTotpResetManagement({
  adminAccessLevel,
  setStaffActionId,
  setStaffActionError,
  setOwnerError,
}: Props) {
  const [accounts, setAccounts] = useState<TotpResetAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [pendingReset, setPendingReset] = useState<PendingTotpReset | null>(null);
  const [success, setSuccess] = useState('');

  async function loadAccounts() {
    setLoading(true);
    setError('');
    try {
      const [restaurantAccounts, adminResult] = await Promise.all([
        fetchTotpResetAccounts(),
        fetchAdministrators(),
      ]);
      if (adminResult.error) throw adminResult.error;
      const systemAdmins: TotpResetAccount[] = (adminResult.data ?? [])
        .filter((admin: { access_level?: string; status?: string; admin_user_id?: string }) =>
          admin.admin_user_id && ['administrator', 'view_only'].includes(admin.access_level ?? '') &&
          ['active', 'pending'].includes(admin.status ?? ''),
        )
        .map((admin: { admin_user_id: string; email?: string | null; name?: string | null; access_level: string }) => ({
          userId: admin.admin_user_id,
          restaurantId: '',
          restaurantName: 'System Admin',
          displayName: admin.name?.trim() || admin.email || 'System Administrator',
          email: admin.email || '',
          role: 'system_admin' as const,
          accessLevel: admin.access_level,
        }));
      setAccounts([...systemAdmins, ...restaurantAccounts]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load restaurant accounts.');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  async function requestReset(
    targetUserId: string,
    displayName: string,
    role: 'restaurant_owner' | 'staff' | 'system_admin',
    restaurantId: string,
    confirmed = false,
  ): Promise<boolean> {
    if (adminAccessLevel !== 'owner') {
      const message = 'Only the System Administrator Owner can reset account authenticators.';
      setStaffActionError(message);
      setOwnerError(message);
      return false;
    }
    if (!targetUserId || (role !== 'system_admin' && !restaurantId)) {
      const message = 'This account is not linked to a Supabase Auth user.';
      setStaffActionError(message);
      setOwnerError(message);
      return false;
    }
    if (!confirmed) {
      setSuccess('');
      const target = accounts.find((account) => account.userId === targetUserId && account.role === role);
      setPendingReset({ userId: targetUserId, displayName, role, restaurantId, accessLevel: target?.accessLevel });
      return false;
    }

    setStaffActionId(targetUserId);
    setStaffActionError('');
    setOwnerError('');
    try {
      if (role === 'system_admin') {
        await resetCoAdministratorTotp(targetUserId);
      } else {
        await resetRestaurantUserTotpService(targetUserId, restaurantId, role);
      }
      await recordAdminAudit(role === 'system_admin' ? 'System Administrator TOTP reset' : 'Restaurant account TOTP reset', restaurantId || null, role, targetUserId, {
        target_user_id: targetUserId,
        target_role: role,
        account_label: displayName,
        factor_type: 'totp',
      });
      setSuccess('Authenticator reset for ' + displayName + '. They must sign in and enroll a new authenticator before accessing Web2Table.');
      return true;
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : 'Unable to reset this authenticator.';
      setStaffActionError(message);
      setOwnerError(message);
      return false;
    } finally {
      setStaffActionId(null);
    }
  }

  return {
    accounts,
    loading,
    search,
    setSearch,
    error,
    pendingReset,
    setPendingReset,
    success,
    setSuccess,
    loadAccounts,
    requestReset,
  };
}
