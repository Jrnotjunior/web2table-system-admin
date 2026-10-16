import { useState, type FormEvent } from 'react';
import type { Administrator, PendingAdministratorAction } from '../types';
import {
  deleteRevokedAdministratorAccess,
  fetchAdministrators,
  restoreAdministratorAccess,
  revokeAdministratorAccess,
  updateAdministratorAccessLevel,
} from '../services/administratorService';
import { inviteSystemAdministrator } from '../services/systemAdminInviteService';

export function useAdministratorManagement() {
  const [administratorsLoading, setAdministratorsLoading] = useState(false);
  const [administratorSearch, setAdministratorSearch] = useState('');
  const [administratorsError, setAdministratorsError] = useState('');
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [pendingAdminAction, setPendingAdminAction] = useState<PendingAdministratorAction | null>(null);
  const [adminActionSaving, setAdminActionSaving] = useState(false);
  const [showInviteAdmin, setShowInviteAdmin] = useState(false);
  const [inviteAdminEmail, setInviteAdminEmail] = useState('');
  const [inviteAdminAccessLevel, setInviteAdminAccessLevel] = useState<'administrator' | 'view_only'>('administrator');
  const [inviteAdminSaving, setInviteAdminSaving] = useState(false);
  const [inviteAdminError, setInviteAdminError] = useState('');
  const [inviteAdminSuccess, setInviteAdminSuccess] = useState('');
  const [inviteAdminConfirmationEmail, setInviteAdminConfirmationEmail] = useState('');

  async function loadAdministrators() {
    setAdministratorsLoading(true);
    setAdministratorsError('');
    const { data, error } = await fetchAdministrators();
    if (error) {
      setAdministratorsError(error.message);
      setAdministrators([]);
    } else {
      setAdministrators((Array.isArray(data) ? data : []) as Administrator[]);
    }
    setAdministratorsLoading(false);
  }

  async function inviteAdministrator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteAdminSaving(true);
    setInviteAdminError('');
    setInviteAdminSuccess('');

    const result = await inviteSystemAdministrator({
      email: inviteAdminEmail.trim(),
      accessLevel: inviteAdminAccessLevel,
    });

    if (result.error) {
      setInviteAdminError(result.error);
      setInviteAdminSaving(false);
      return;
    }

    const sentEmail = inviteAdminEmail.trim();
    setInviteAdminSuccess(`Invitation sent to ${sentEmail}.`);
    setInviteAdminConfirmationEmail(sentEmail);
    setShowInviteAdmin(false);
    setInviteAdminEmail('');
    setInviteAdminAccessLevel('administrator');
    setInviteAdminSaving(false);
    await loadAdministrators();
  }

  async function confirmAdministratorAction() {
    if (!pendingAdminAction) return;
    setAdminActionSaving(true);
    setAdministratorsError('');

    const { type, admin, nextAccessLevel } = pendingAdminAction;
    let error: { message: string } | null = null;

    if (type === 'revoke') {
      const result = await revokeAdministratorAccess(admin.admin_user_id);
      error = result.error;
    } else if (type === 'restore') {
      const result = await restoreAdministratorAccess(admin.admin_user_id);
      error = result.error;
    } else if (type === 'delete') {
      const result = await deleteRevokedAdministratorAccess(admin.admin_user_id);
      error = result.error;
    } else if (nextAccessLevel) {
      const result = await updateAdministratorAccessLevel(admin.admin_user_id, nextAccessLevel);
      error = result.error;
    }

    if (error) {
      setAdministratorsError(error.message);
      setAdminActionSaving(false);
      return;
    }

    setPendingAdminAction(null);
    setAdminActionSaving(false);
    await loadAdministrators();
  }

  return {
    administratorsLoading,
    administratorSearch,
    setAdministratorSearch,
    administratorsError,
    administrators,
    pendingAdminAction,
    setPendingAdminAction,
    adminActionSaving,
    showInviteAdmin,
    setShowInviteAdmin,
    inviteAdminEmail,
    setInviteAdminEmail,
    inviteAdminAccessLevel,
    setInviteAdminAccessLevel,
    inviteAdminSaving,
    inviteAdminError,
    inviteAdminSuccess,
    inviteAdminConfirmationEmail,
    setInviteAdminConfirmationEmail,
    setInviteAdminError,
    setInviteAdminSuccess,
    loadAdministrators,
    inviteAdministrator,
    confirmAdministratorAction,
  };
}
