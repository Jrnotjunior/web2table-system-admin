import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase, isPasswordSetupPending, isPasswordSetupCompleted, markPasswordSetupPending, markPasswordSetupCompleted, clearPasswordSetupPending } from './lib/supabase';
import { type AdminPage } from './app/navigation';
import { useAdministratorManagement } from './features/administrators/hooks/useAdministratorManagement';
import type { DashboardPlatformHealth, DashboardRestaurantMonitoring, DashboardSummary } from './features/dashboard/types';
import type { AuditLog } from './shared/types/audit';
import { useTotpResetManagement } from './features/totp-reset/hooks/useTotpResetManagement';
import { recordAuthAuditEvent, recordAdminAudit } from './shared/services/auditService';
import { fetchAuditLogs } from './features/audit/services/auditLogService';
import { getAuditDateRange } from './features/audit/utils/auditDateRange';
import { useAuditLogRealtime } from './features/audit/hooks/useAuditLogRealtime';
import { useSystemAdminAuthListener } from './features/administrators/hooks/useSystemAdminAuthListener';
import { exportAuditLogsCsv } from './features/audit/utils/exportAuditLogsCsv';
import { fetchDashboardData } from './features/dashboard/services/dashboardService';
import { fetchRestaurants, fetchRestaurantById, deleteRestaurant as deleteRestaurantService } from './features/restaurants/services/restaurantService';
import { setRestaurantCustomDomain } from './features/restaurants/services/restaurantDomainService';
import { updateRestaurantActiveStatus } from './features/restaurants/services/restaurantProfileService';
import { inviteRestaurantTenant } from './features/restaurants/services/restaurantInvitationService';
import { fetchRestaurantPackage, assignRestaurantPackage as assignRestaurantPackageService, setRestaurantModuleOverride } from './features/restaurants/services/restaurantPackageService';
import { fetchRestaurantSettings, updateRestaurantSettings, fetchOnlinePaymentsEnabled, updateOnlinePaymentsEnabled, fetchTaxpayerProfile, reviewTaxpayerProfile, fetchBirIssuanceReadiness, configureDisabledInvoiceSeries, type DisabledInvoiceSeriesInput, type TaxpayerProfileReview, type BirIssuanceReadiness } from './features/restaurants/services/restaurantSettingsService';
import { fetchRestaurantStaff, deleteRestaurantStaff, setRestaurantStaffActive as setRestaurantStaffActiveService } from './features/restaurants/services/restaurantStaffService';
import { fetchRestaurantOwner, assignRestaurantOwner as assignRestaurantOwnerService, inviteRestaurantOwner, removeRestaurantOwner } from './features/restaurants/services/restaurantOwnerService';

import { fetchMySystemAdminAccessLevel } from './features/administrators/services/currentAdminAccessService';
import { activateSystemAdminInvitation } from './features/administrators/services/systemAdminInvitationService';

import useAppNavigation from './app/useAppNavigation';
import AppShell from './app/AppShell';
import DashboardPage from './features/dashboard/DashboardPage';
import AuditLogsPage from './features/audit/AuditLogsPage';
import TotpResetPage from './features/totp-reset/TotpResetPage';
import AdministratorsPage from './features/administrators/AdministratorsPage';
import RestaurantDomainConfirmation from './features/restaurants/components/RestaurantDomainConfirmation';
import RestaurantSettingsConfirmation from './features/restaurants/components/RestaurantSettingsConfirmation';
import RestaurantOwnerAssignmentConfirmation from './features/restaurants/components/RestaurantOwnerAssignmentConfirmation';
import PlatformHealthPage from './components/PlatformHealthPage';
import MapboxUsagePage from './components/MapboxUsagePage';
import SystemAdminMfaGate from './components/SystemAdminMfaGate';
import SystemAdminSidebar from './components/SystemAdminSidebar';
import RestaurantsPage from './features/restaurants/RestaurantsPage';
import type { Restaurant, RestaurantPackageRow, RestaurantStaff } from './features/restaurants/types';
import RestaurantDetailsPage from './features/restaurants/RestaurantDetailsPage';

function isAdminPage(current: AdminPage, target: AdminPage) {
  return current === target;
}




function AppContent() {
  const { getNavigationFromUrl, pushNavigation } = useAppNavigation();
  const [email, setEmail] = useState('');

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authDialogMessage, setAuthDialogMessage] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminAccessLevel, setAdminAccessLevel] = useState<'owner' | 'administrator' | 'view_only' | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const {
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
    inviteAdminName,
    setInviteAdminName,
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
  } = useAdministratorManagement();
  const [showInviteTenant, setShowInviteTenant] = useState(false);
  const [inviteTenantEmail, setInviteTenantEmail] = useState('');
  const [inviteTenantFirstName, setInviteTenantFirstName] = useState('');
  const [inviteTenantLastName, setInviteTenantLastName] = useState('');
  const [inviteTenantRestaurantName, setInviteTenantRestaurantName] = useState('');
  const [inviteTenantSlug, setInviteTenantSlug] = useState('');
  const [inviteTenantSaving, setInviteTenantSaving] = useState(false);
  const [inviteTenantError, setInviteTenantError] = useState('');
  const [inviteTenantSuccess, setInviteTenantSuccess] = useState('');
  const [inviteSetup, setInviteSetup] = useState(false);
  const [invitePassword, setInvitePassword] = useState('');
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState('');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [showInvitePasswordConfirm, setShowInvitePasswordConfirm] = useState(false);
  const [inviteSetupError, setInviteSetupError] = useState('');
  const [inviteSettingPassword, setInviteSettingPassword] = useState(false);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [restaurantError, setRestaurantError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const canManage = adminAccessLevel === 'owner' || adminAccessLevel === 'administrator';
  const [manageTab, setManageTab] = useState<'overview' | 'owner' | 'domain' | 'settings' | 'staff' | 'package'>('overview');
  const [restaurantPackageId, setRestaurantPackageId] = useState<number | null>(null);
  const [restaurantPackageRows, setRestaurantPackageRows] = useState<RestaurantPackageRow[]>([]);
  const [packageLoading, setPackageLoading] = useState(false);
  const [packageSaving, setPackageSaving] = useState(false);
  const [packageError, setPackageError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [restaurantStaff, setRestaurantStaff] = useState<RestaurantStaff[]>([]);
  const [staffActionId, setStaffActionId] = useState<string | null>(null);
  const [staffActionError, setStaffActionError] = useState('');
  const [pendingDeleteStaff, setPendingDeleteStaff] = useState<typeof restaurantStaff[number] | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [pendingSaveSettings, setPendingSaveSettings] = useState(false);
  const [cashOnDeliveryEnabled, setCashOnDeliveryEnabled] = useState(true);
  const [cashOnPickupEnabled, setCashOnPickupEnabled] = useState(true);
  const [cashOnTakeOutEnabled, setCashOnTakeOutEnabled] = useState(true);
  const [automaticRiderAssignmentEnabled, setAutomaticRiderAssignmentEnabled] = useState(false);
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState(true);
  const [vatRegistered, setVatRegistered] = useState(false);
  const [pricesVatInclusive, setPricesVatInclusive] = useState(false);
  const [vatRate, setVatRate] = useState('12');
  const [taxpayerProfileLoading, setTaxpayerProfileLoading] = useState(false);
  const [taxpayerProfile, setTaxpayerProfile] = useState<TaxpayerProfileReview | null>(null);
  const [taxpayerProfileError, setTaxpayerProfileError] = useState('');
  const [taxpayerProfileMessage, setTaxpayerProfileMessage] = useState('');
  const [taxpayerProfileSaving, setTaxpayerProfileSaving] = useState(false);
  const [birReadinessLoading, setBirReadinessLoading] = useState(false);
  const [birReadiness, setBirReadiness] = useState<BirIssuanceReadiness | null>(null);
  const [birReadinessError, setBirReadinessError] = useState('');
  const [invoiceSeriesSaving, setInvoiceSeriesSaving] = useState(false);
  const [invoiceSeriesError, setInvoiceSeriesError] = useState('');
  const [invoiceSeriesMessage, setInvoiceSeriesMessage] = useState('');
  const [domain, setDomain] = useState('');
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [pendingSaveDomain, setPendingSaveDomain] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [ownerError, setOwnerError] = useState('');
  const {
    accounts: totpResetAccounts,
    loading: totpResetLoading,
    search: totpResetSearch,
    setSearch: setTotpResetSearch,
    error: totpResetError,
    pendingReset: pendingTotpReset,
    setPendingReset: setPendingTotpReset,
    success: totpResetSuccess,
    setSuccess: setTotpResetSuccess,
    loadAccounts: loadTotpResetAccounts,
    requestReset: resetRestaurantUserTotp,
  } = useTotpResetManagement({
    adminAccessLevel,
    setStaffActionId,
    setStaffActionError,
    setOwnerError,
  });
  const [pendingAssignOwner, setPendingAssignOwner] = useState(false);
  const [ownerInvitationNotice, setOwnerInvitationNotice] = useState('');
  const [pendingRemoveOwner, setPendingRemoveOwner] = useState(false);
  const [pendingRestaurantStatus, setPendingRestaurantStatus] = useState<Restaurant | null>(null);
  const [pendingDeleteRestaurant, setPendingDeleteRestaurant] = useState<Restaurant | null>(null);
  const [restaurantDeleteSaving, setRestaurantDeleteSaving] = useState(false);
  const [adminPage, setAdminPage] = useState<AdminPage>('dashboard');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [dashboardRestaurantMonitoring, setDashboardRestaurantMonitoring] = useState<DashboardRestaurantMonitoring[]>([]);
  const [dashboardRecentLogs, setDashboardRecentLogs] = useState<typeof auditLogs>([]);
  const [dashboardPlatformHealth, setDashboardPlatformHealth] = useState<DashboardPlatformHealth | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEventFilter, setAuditEventFilter] = useState('ALL');
  const [auditDatePreset, setAuditDatePreset] = useState<'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM'>('ALL');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditPageNumber, setAuditPageNumber] = useState(0);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const restaurantsRef = useRef(restaurants);
  const auditLogsRef = useRef(auditLogs);
  const adminAccessLevelRef = useRef(adminAccessLevel);
  restaurantsRef.current = restaurants;
  auditLogsRef.current = auditLogs;
  adminAccessLevelRef.current = adminAccessLevel;

  useAuditLogRealtime(authorized && adminPage === 'audit', () => {
    void loadAuditLogs(auditPageNumber);
  });

  useSystemAdminAuthListener(
    () => {
      setSignedIn(false);
      setAuthorized(false);
      setAdminAccessLevel(null);
      setAccountMenuOpen(false);
      setRestaurants([]);
    },
    () => setSignedIn(true),
  );

    function isSystemAdminInvitation() {
    // This is a UI routing flag only. The activation Edge Function remains the
    // authorization boundary and validates the signed-in email-link session.
    return isPasswordSetupPending();
  }

  async function isEmailLinkSetupSession(accessToken: string): Promise<boolean> {
    if (isPasswordSetupCompleted()) return false;
    const { data, error } = await supabase.auth.getClaims(accessToken);
    if (error || !data?.claims) return false;
    const amr = Array.isArray(data.claims.amr) ? data.claims.amr : [];
    return amr.some((item: unknown) =>
      !!item && typeof item === 'object' &&
      ((item as Record<string, unknown>).method === 'otp' ||
       (item as Record<string, unknown>).method === 'email')
    );
  }

  async function loadMyAccessLevel() {
    const level = await fetchMySystemAdminAccessLevel();
    setAdminAccessLevel(level);
    return level;
  }

  function applyNavigationFromUrl() {
    const navigation = getNavigationFromUrl();
    setAccountMenuOpen(false);

    if (navigation.page === 'restaurant' && navigation.restaurantId) {
      const restaurant = restaurantsRef.current.find((item) => item.id === navigation.restaurantId);
      if (restaurant) {
        setAdminPage('restaurants');
        openRestaurant(restaurant, false);
        return;
      }
      setAdminPage('restaurants');
      setSelectedRestaurant(null);
      void loadRestaurants();
      return;
    }

    setSelectedRestaurant(null);
    setAdminPage(navigation.page === 'restaurant' ? 'restaurants' : navigation.page);

    if (navigation.page === 'maps') {
      setAdminPage('maps');
    } else if (navigation.page === 'dashboard') {
      void loadDashboard();
    } else if (navigation.page === 'restaurants') {
      void loadRestaurants();
    } else if (navigation.page === 'audit') {
      setAuditPageNumber(0);
      void loadAuditLogs(0);
    } else if (navigation.page === 'administrators' && adminAccessLevel != null) {
      void loadAdministrators();
    } else if (navigation.page === 'totp-reset') {
      void loadTotpResetAccounts();
    }
  }

  function openPlatformHealth(pushHistory = true) {
    if (pushHistory) pushNavigation('health');
    setAccountMenuOpen(false);
    setSelectedRestaurant(null);
    setSelectedAuditLog(null);
    setAdminPage('health');
  }

  function openMapboxUsage(pushHistory = true) {
    if (pushHistory) pushNavigation('maps');
    setAccountMenuOpen(false);
    setSelectedRestaurant(null);
    setSelectedAuditLog(null);
    setAdminPage('maps');
  }

  function openAdministrators(pushHistory = true) {
    if (adminAccessLevel == null) return;
    if (pushHistory) pushNavigation('administrators');
    setAccountMenuOpen(false);
    setAdminPage('administrators');
    setSelectedRestaurant(null);
    setInviteAdminError('');
    setInviteAdminSuccess('');
    setInviteAdminConfirmationEmail('');
    void loadAdministrators();
  }

  // The original invitation OTP is one-time. React StrictMode can mount the
  // screen twice during development, so verify exactly once per page load.
  async function checkAdminSession() {
    // Supabase invitation emails can arrive with a token_hash in the query
    // string. Verify it first so the invite token becomes an authenticated
    // session and the password-setup screen is shown instead of sign-in.
    const invitationParams = new URLSearchParams(window.location.search);
    const invitationTokenHash = invitationParams.get('token_hash');
    if (invitationParams.get('type') === 'invite' && invitationTokenHash) {
      invitationVerification ??= supabase.auth.verifyOtp({
        token_hash: invitationTokenHash,
        type: 'invite',
      });
      const { error: invitationVerificationError } = await invitationVerification;

      if (invitationVerificationError) {
        clearPasswordSetupPending();
        setAuthDialogMessage('This invitation link is invalid or expired. Ask the administrator to send a new invitation.');
        setInviteSetupError(invitationVerificationError.message);
        setInviteSetup(false);
        setSignedIn(false);
        setAuthorized(false);
        setLoading(false);
        return false;
      }

      invitationParams.delete('token_hash');
      const remainingQuery = invitationParams.toString();
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`,
      );
    }

    const { data: sessionData, error: sessionReadError } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (sessionReadError || !session) {
      clearPasswordSetupPending();
      setCurrentUserEmail('');
      setSignedIn(false);
      setAuthorized(false);
      setInviteSetup(false);
      setLoading(false);
      return false;
    }

    // getSession reads local storage; it does NOT prove the email link/session
    // is valid. Validate directly with Supabase Auth before showing the original
    // password creation form, so an expired token never reaches updateUser().
    // Do NOT call setSession() again with the just-returned tokens: that can
    // race refresh-token rotation during invitation callbacks.
    const { data: verifiedIdentity, error: identityError } = await supabase.auth.getUser();
    if (identityError || !verifiedIdentity.user ||
        verifiedIdentity.user.id !== session.user.id) {
      clearPasswordSetupPending();
      setInvitePassword('');
      setInvitePasswordConfirm('');
      setInviteSetup(false);
      setSignedIn(false);
      setAuthorized(false);
      setLoading(false);
      setAuthDialogMessage('Your invitation link is invalid or expired. Request a new invitation from the administrator.');
      window.history.replaceState(window.history.state, '', window.location.pathname);
      void supabase.auth.signOut({ scope: 'local' });
      return false;
    }

    setCurrentUserEmail(verifiedIdentity.user.email ?? '');

    const isSessionCurrent = async () => {
      const { data: currentSessionData } = await supabase.auth.getSession();
      return currentSessionData.session?.user.id === verifiedIdentity.user?.id;
    };

    if (!(await isSessionCurrent())) {
      setLoading(false);
      return false;
    }

    setSignedIn(true);

    if (isSystemAdminInvitation() || await isEmailLinkSetupSession(session.access_token)) {
      // Recover from the session's signed email-link AMR if the one-use URL was
      // consumed before the latest UI bundle was loaded. The server still checks
      // this session before allowing password activation.
      markPasswordSetupPending();
      window.history.replaceState(window.history.state, '', window.location.pathname);
      setInviteSetup(true);
      setInviteSetupError('');
      setLoading(false);
      return true;
    }

    const accessLevel = await loadMyAccessLevel();

    if (!(await isSessionCurrent())) {
      setLoading(false);
      return false;
    }

    if (!accessLevel) {
      await supabase.auth.signOut();
      setSignedIn(false);
      setAuthorized(false);
      setInviteSetup(false);
      setLoading(false);
      return false;
    }

    setAuthorized(true);
    setInviteSetup(false);
    await loadDashboard(session.user.id);
    setLoading(false);
    return true;
  }

  async function completeSystemAdminInvitation() {
    setInviteSetupError('');

    if (invitePassword.length < 8) {
      setInviteSetupError('Your password must be at least 8 characters.');
      return;
    }

    if (invitePassword !== invitePasswordConfirm) {
      setInviteSetupError('The passwords do not match.');
      return;
    }

    // Immediately show visible feedback so a click never looks like a no-op.
    setInviteSetupError('Contacting the server to create your password…');
    setInviteSettingPassword(true);
    try {
      const result = await Promise.race([
        activateSystemAdminInvitation(invitePassword),
        new Promise<{ error: { message: string } }>(resolve =>
          window.setTimeout(() => resolve({
            error: { message: 'The server did not respond within 15 seconds. Check your connection and try again. If this repeats, the Network tab will show the failed password-activation request.' },
          }), 15000),
        ),
      ]);
      if (result.error) {
        const message = result.error.message?.trim() ||
          'The server rejected password setup (HTTP 403). Your session or System Administrator invitation may not be valid for this account.';
        setInviteSetupError(message);
        window.alert(`Unable to create password\n\n${message}`);
        return;
      }

      // Admin API password updates can invalidate the original email-link session.
      // Establish a fresh password-authenticated session before the MFA gate runs.
      const { data: reauthenticated, error: reauthenticationError } =
        await supabase.auth.signInWithPassword({
          email: currentUserEmail.trim(),
          password: invitePassword,
        });
      if (reauthenticationError || !reauthenticated.session) {
        const message = `Your password was created, but the setup session could not be renewed for MFA. Sign in with your new password to continue. ${reauthenticationError?.message ?? ''}`.trim();
        setInviteSetupError(message);
        window.alert(message);
        markPasswordSetupCompleted();
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // The redirect to sign-in also clears any stale local session on next load.
        }
        window.location.replace(window.location.origin + '/');
        return;
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Unable to create password. Please reopen a valid account setup invitation.';
      setInviteSetupError(message);
      window.alert(`Unable to create password\n\n${message}`);
      return;
    } finally {
      setInviteSettingPassword(false);
    }

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname,
    );

    setInvitePassword('');
    setInvitePasswordConfirm('');
    // Only after the first password has been saved do we run the existing
    // MFA challenge. No administrator privilege is granted by this screen.
    markPasswordSetupCompleted();
    window.location.replace(window.location.origin + '/');
  }

  useEffect(() => {
    void checkAdminSession();
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setAuthDialogMessage(error.message === 'Invalid login credentials' ? 'Invalid login credentials. Please check your email address and password.' : error.message);
      return;
    }

    if (!signInData.session) {
      setLoading(false);
      setAuthDialogMessage('Sign in succeeded but no authenticated session was established.');
      return;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    });

    if (sessionError) {
      setLoading(false);
      setAuthDialogMessage(sessionError.message);
      return;
    }

    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) {
      setLoading(false);
      setAuthDialogMessage(assuranceError.message);
      return;
    }
    if (assurance.currentLevel !== 'aal2') {
      // Preserve the final UI: its existing SystemAdminMfaGate handles MFA.
      // Re-enter via that gate instead of signing out a legitimate user
      // merely because the database role requires an AAL2 session.
      window.location.reload();
      return;
    }

    const accessLevel = await loadMyAccessLevel();

    if (!accessLevel) {
      await supabase.auth.signOut();
      setSignedIn(false);
      setAuthorized(false);
      setLoading(false);
      setAuthDialogMessage('This account does not have active System Administrator access.');
      return;
    }

    await recordAuthAuditEvent(
      'LOGIN_SUCCESS',
      'System Administrator signed in',
      { source: 'system_admin_web_app', access_level: accessLevel },
    );

    setAuthorized(true);
    await loadDashboard(signInData.user?.id);
    setLoading(false);
  }

  async function signOut() {
    await recordAuthAuditEvent(
      'LOGOUT',
      'System Administrator signed out',
      { source: 'system_admin_web_app' },
    );

    await supabase.auth.signOut();
  }

  async function loadRestaurantPackage(restaurantId: string) {
    setPackageLoading(true);
    setPackageError('');

    const { data, error } = await fetchRestaurantPackage(restaurantId);

    if (error) {
      setPackageError(error.message);
      setRestaurantPackageId(null);
      setRestaurantPackageRows([]);
    } else {
      const rows = (Array.isArray(data) ? data : []) as typeof restaurantPackageRows;
      setRestaurantPackageRows(rows);
      setRestaurantPackageId(rows[0]?.package_id ?? null);
    }

    setPackageLoading(false);
  }

  async function assignRestaurantPackage(packageId: number) {
    if (!selectedRestaurant) return;

    setPackageSaving(true);
    setPackageError('');

    const { error } = await assignRestaurantPackageService(selectedRestaurant.id, packageId);

    if (error) {
      setPackageError(error.message);
    } else {
      await loadRestaurantPackage(selectedRestaurant.id);
    }

    setPackageSaving(false);
  }

  async function setRestaurantModuleEnabled(moduleKey: string, enabled: boolean) {
    if (!selectedRestaurant) return;

    setPackageSaving(true);
    setPackageError('');

    const { error } = await setRestaurantModuleOverride(selectedRestaurant.id, moduleKey, enabled);

    if (error) {
      setPackageError(error.message);
    } else {
      await loadRestaurantPackage(selectedRestaurant.id);
    }

    setPackageSaving(false);
  }

  async function loadRestaurantSettings(restaurantId: string) {
    setSettingsLoading(true);
    setTaxpayerProfileLoading(true);
    setBirReadinessLoading(true);
    setSettingsError('');
    setTaxpayerProfileError('');
    setTaxpayerProfileMessage('');
    setBirReadinessError('');

    const [{ data, error }, onlinePaymentsResult, taxpayerProfileResult, birReadinessResult] = await Promise.all([
      fetchRestaurantSettings(restaurantId),
      fetchOnlinePaymentsEnabled(restaurantId),
      fetchTaxpayerProfile(restaurantId),
      fetchBirIssuanceReadiness(restaurantId),
    ]);

    if (error) {
      setSettingsError(error.message);
    } else {
      const settings = Array.isArray(data) ? data[0] : data;
      setCashOnDeliveryEnabled(settings?.cash_on_delivery_enabled ?? true);
      setCashOnPickupEnabled(settings?.cash_on_pickup_enabled ?? true);
      setCashOnTakeOutEnabled(settings?.cash_on_take_out_enabled ?? true);
      setAutomaticRiderAssignmentEnabled(settings?.automatic_rider_assignment_enabled ?? false);
      setVatRegistered(settings?.tax_vat_registered ?? false);
      setPricesVatInclusive(settings?.tax_prices_vat_inclusive ?? false);
      setVatRate(String(settings?.tax_vat_rate ?? 0));
      if (onlinePaymentsResult.error) setSettingsError(onlinePaymentsResult.error.message);
      else setOnlinePaymentsEnabled(Boolean(onlinePaymentsResult.data));
    }

    if (taxpayerProfileResult.error) {
      setTaxpayerProfile(null);
      setTaxpayerProfileError(taxpayerProfileResult.error.message);
    } else {
      setTaxpayerProfile(taxpayerProfileResult.data as unknown as TaxpayerProfileReview | null);
    }
    if (birReadinessResult.error) {
      setBirReadiness(null);
      setBirReadinessError(birReadinessResult.error.message);
    } else {
      setBirReadiness(birReadinessResult.data as unknown as BirIssuanceReadiness | null);
    }
    setBirReadinessLoading(false);
    setTaxpayerProfileLoading(false);
    setSettingsLoading(false);
  }

  async function saveTaxpayerProfileReview() {
    if (!selectedRestaurant || !taxpayerProfile) return;
    setTaxpayerProfileSaving(true);
    setTaxpayerProfileError('');
    setTaxpayerProfileMessage('');
    const { data, error } = await reviewTaxpayerProfile(selectedRestaurant.id, {
      profile_status: taxpayerProfile.profile_status,
      review_note: taxpayerProfile.review_note,
      bir_route_status: taxpayerProfile.bir_route_status,
      bir_accreditation_reference: taxpayerProfile.bir_accreditation_reference,
      bir_permit_to_use_reference: taxpayerProfile.bir_permit_to_use_reference,
      bir_permit_to_transmit_reference: taxpayerProfile.bir_permit_to_transmit_reference,
      approved_software_version: taxpayerProfile.approved_software_version,
      bir_approval_recorded_at: taxpayerProfile.bir_approval_recorded_at,
    });
    if (error) {
      setTaxpayerProfileError(error.message);
    } else {
      setTaxpayerProfile(data as unknown as TaxpayerProfileReview);
      const { data: readinessData, error: readinessError } = await fetchBirIssuanceReadiness(selectedRestaurant.id);
      if (readinessError) {
        setBirReadinessError(readinessError.message);
      } else {
        setBirReadiness(readinessData as unknown as BirIssuanceReadiness | null);
        setBirReadinessError('');
      }
      setTaxpayerProfileMessage('Taxpayer profile review saved. This platform review is not BIR accreditation or approval.');
    }
    setTaxpayerProfileSaving(false);
  }

  async function saveDisabledInvoiceSeries(input: DisabledInvoiceSeriesInput) {
    if (!selectedRestaurant) return;
    setInvoiceSeriesSaving(true);
    setInvoiceSeriesError('');
    setInvoiceSeriesMessage('');
    try {
      const { data, error } = await configureDisabledInvoiceSeries(selectedRestaurant.id, input);
      if (error) {
        setInvoiceSeriesError(error.message);
      } else {
        const { data: readinessData, error: readinessError } = await fetchBirIssuanceReadiness(selectedRestaurant.id);
        if (readinessError) {
          setBirReadinessError(readinessError.message);
        } else {
          setBirReadiness(readinessData as unknown as BirIssuanceReadiness | null);
          setBirReadinessError('');
        }
        const result = data as { notice?: string } | null;
        setInvoiceSeriesMessage(result?.notice ?? 'Serial series saved with invoice issuance disabled.');
      }
    } catch (saveError) {
      setInvoiceSeriesError(saveError instanceof Error ? saveError.message : 'Unable to save disabled invoice serial series.');
    } finally {
      setInvoiceSeriesSaving(false);
    }
  }

  async function saveRestaurantSettings() {
    if (!selectedRestaurant) return;

    setSettingsSaving(true);
    setSettingsError('');

    const { data, error } = await updateRestaurantSettings(selectedRestaurant.id, {
      cashOnDeliveryEnabled,
      cashOnPickupEnabled,
      cashOnTakeOutEnabled,
      automaticRiderAssignmentEnabled,
      vatRegistered,
      pricesVatInclusive,
      vatRate: Number(vatRate),
    });

    if (error) {
      setSettingsError(error.message);
    } else {
      const { error: onlinePaymentsError } = await updateOnlinePaymentsEnabled(selectedRestaurant.id, onlinePaymentsEnabled);
      if (onlinePaymentsError) setSettingsError(onlinePaymentsError.message);
      const settings = Array.isArray(data) ? data[0] : data;
      setCashOnDeliveryEnabled(settings?.cash_on_delivery_enabled ?? cashOnDeliveryEnabled);
      setCashOnPickupEnabled(settings?.cash_on_pickup_enabled ?? cashOnPickupEnabled);
      setAutomaticRiderAssignmentEnabled(settings?.automatic_rider_assignment_enabled ?? automaticRiderAssignmentEnabled);
      setVatRegistered(settings?.tax_vat_registered ?? vatRegistered);
      setPricesVatInclusive(settings?.tax_prices_vat_inclusive ?? pricesVatInclusive);
      setVatRate(String(settings?.tax_vat_rate ?? vatRate));
    }

    setSettingsSaving(false);
    setPendingSaveSettings(false);
  }

  async function loadRestaurantStaff(restaurantId: string) {
    setStaffLoading(true);
    setStaffError('');

    const { data, error } = await fetchRestaurantStaff(restaurantId);

    if (error) {
      setStaffError(error.message);
      setRestaurantStaff([]);
    } else {
      setRestaurantStaff(Array.isArray(data) ? data : []);
    }

    setStaffLoading(false);
  }

  async function setRestaurantStaffActive(staffId: string, isActive: boolean) {
    setStaffActionId(staffId);
    setStaffActionError('');

    const { error } = await setRestaurantStaffActiveService(staffId, isActive);

    if (error) {
      setStaffActionError(error.message);
      setStaffActionId(null);
      return;
    }


    if (selectedRestaurant) {
      await loadRestaurantStaff(selectedRestaurant.id);
    }

    setStaffActionId(null);
  }

  function requestDeleteRestaurantStaff(staff: typeof restaurantStaff[number]) {
    setStaffActionError('');
    setPendingDeleteStaff(staff);
  }


  async function confirmDeleteRestaurantStaff() {
    if (!pendingDeleteStaff) return;

    const staffId = pendingDeleteStaff.id;
    setStaffActionId(staffId);
    setStaffActionError('');

    const { data, error } = await deleteRestaurantStaff(staffId);

    if (error) {
      setStaffActionError(error.message);
      setStaffActionId(null);
      return;
    }

    if (data?.error) {
      setStaffActionError(String(data.error));
      setStaffActionId(null);
      return;
    }

    setPendingDeleteStaff(null);

    if (selectedRestaurant) {
      await loadRestaurantStaff(selectedRestaurant.id);
    }

    setStaffActionId(null);
  }

  async function saveDomain() {
    if (!selectedRestaurant) return;
    setDomainSaving(true);
    setDomainError('');
    const { data, error } = await setRestaurantCustomDomain(
      selectedRestaurant.id,
      domain.trim(),
    );
    if (error) {
      setDomainError(error.message);
    } else {
      setDomain(typeof data === 'string' ? data : domain.trim().toLowerCase());
      setPendingSaveDomain(false);
    }
    setDomainSaving(false);
  }

  async function inviteTenant(event: FormEvent) {
    event.preventDefault();
    setInviteTenantSaving(true);
    setInviteTenantError('');
    setInviteTenantSuccess('');

    const email = inviteTenantEmail.trim().toLowerCase();
    const firstName = inviteTenantFirstName.trim();
    const lastName = inviteTenantLastName.trim();
    const ownerName = `${firstName} ${lastName}`.trim();
    const restaurantName = inviteTenantRestaurantName.trim();
    const slug = inviteTenantSlug.trim().toLowerCase();

    if (!firstName || !lastName) {
      setInviteTenantError('First name and last name are required.');
      setInviteTenantSaving(false);
      return;
    }

    if (!email) {
      setInviteTenantError('Owner email is required.');
      setInviteTenantSaving(false);
      return;
    }

    const result = await inviteRestaurantTenant({
      email,
      ownerName,
      name: restaurantName,
      slug,
    });

    if (result.error) {
      setInviteTenantError(result.error);
      setInviteTenantSaving(false);
      return;
    }

    setInviteTenantSuccess(
      `Restaurant "${restaurantName}" was created and the owner invitation was sent to ${email}.`,
    );
    setInviteTenantEmail('');
    setInviteTenantFirstName('');
    setInviteTenantLastName('');
    setInviteTenantRestaurantName('');
    setInviteTenantSlug('');
    setInviteTenantSaving(false);
  }

  async function loadRestaurantOwner(restaurantId: string) {
    setOwnerLoading(true);
    setOwnerError('');
    const { data, error } = await fetchRestaurantOwner(restaurantId);
    if (error) {
      setOwnerError(error.message);
      setOwnerEmail('');
      setOwnerName('');
      setOwnerUserId('');
    } else {
      const owner = Array.isArray(data) ? data[0] : data;
      setOwnerEmail(owner?.email ?? '');
      setOwnerName(owner?.full_name ?? '');
      setOwnerUserId(owner?.user_id ?? '');
    }
    setOwnerLoading(false);
  }

  async function assignOwner() {
    if (!selectedRestaurant || !ownerEmail.trim()) return;
    setOwnerSaving(true);
    setOwnerError('');
    const { data, error } = await assignRestaurantOwnerService(selectedRestaurant.id, ownerEmail.trim());
    if (error) {
      const missingAuthAccount = /no auth account was found/i.test(error.message);
      if (!missingAuthAccount) {
        setOwnerError(error.message);
        setOwnerSaving(false);
        return;
      }

      const { data: invitationData, error: invitationError } = await inviteRestaurantOwner(
        selectedRestaurant.id,
        ownerEmail.trim(),
      );

      if (invitationError || invitationData?.error || !invitationData?.success) {
        setOwnerError(invitationData?.error || invitationError?.message || 'Unable to invite the restaurant owner.');
        setOwnerSaving(false);
        return;
      }

      setOwnerName('');
      setOwnerUserId(invitationData.user_id ?? '');
      setOwnerSaving(false);
      setPendingAssignOwner(false);
      setOwnerError('');
      setOwnerInvitationNotice(`An invitation was sent to ${ownerEmail.trim()}. They can finish setting up their account using the invitation email.`);
      return;
    }
    const owner = Array.isArray(data) ? data[0] : data;
    setOwnerEmail(owner?.email ?? ownerEmail.trim());
    setOwnerName(owner?.full_name ?? '');
    setOwnerUserId(owner?.user_id ?? '');
    setOwnerSaving(false);
    setPendingAssignOwner(false);
  }

  async function removeOwner() {
    if (!selectedRestaurant) return;
    setOwnerSaving(true);
    setOwnerError('');
    const { error } = await removeRestaurantOwner(selectedRestaurant.id);
    if (error) {
      setOwnerError(error.message);
    } else {
      setOwnerEmail('');
      setOwnerName('');
      setOwnerUserId('');
      setPendingRemoveOwner(false);
    }
    setOwnerSaving(false);
  }

  async function loadDashboard(userId?: string) {
    setDashboardLoading(true);
    setDashboardError('');

    const [summaryResult, monitoringResult, logsResult, healthResult] = await fetchDashboardData();

    if (summaryResult.error) {
      setDashboardError(summaryResult.error.message);
      setDashboardSummary(null);
    } else {
      const summary = Array.isArray(summaryResult.data) ? summaryResult.data[0] : summaryResult.data;
      if (!summary) {
        setDashboardError('Dashboard summary returned no row.');
        setDashboardSummary(null);
      } else {
        setDashboardSummary(summary);
      }
    }

    const monitoringError = monitoringResult.error;
    if (monitoringError) {
      setDashboardError((current) => current || monitoringError.message);
      setDashboardRestaurantMonitoring([]);
    } else {
      setDashboardRestaurantMonitoring((Array.isArray(monitoringResult.data) ? monitoringResult.data : []) as typeof dashboardRestaurantMonitoring);
      if (!Array.isArray(monitoringResult.data)) {
        setDashboardError((current) => current || 'Restaurant monitoring returned an unexpected response.');
      }
    }

    const logsError = logsResult.error;
    if (logsError) {
      setDashboardError((current) => current || logsError.message);
      setDashboardRecentLogs([]);
    } else {
      setDashboardRecentLogs((Array.isArray(logsResult.data) ? logsResult.data : []) as typeof auditLogs);
    }

    if (healthResult.error || !healthResult.data) {
      setDashboardPlatformHealth(null);
    } else {
      setDashboardPlatformHealth(healthResult.data as typeof dashboardPlatformHealth);
    }

    setDashboardLoading(false);
  }

  async function loadAuditLogs(pageNumber = auditPageNumber) {
    setAuditLoading(true);
    setAuditError('');

    const { startDate, endDate } = getAuditDateRange(
      auditDatePreset,
      auditStartDate,
      auditEndDate,
    );

    const pageSize = 50;
    const { data, error } = await fetchAuditLogs({
      eventType: auditEventFilter === 'ALL' ? null : auditEventFilter,
      limit: pageSize,
      offset: pageNumber * pageSize,
      search: auditSearch.trim() || null,
      startDate,
      endDate,
    });

    if (error) {
      setAuditError(error.message);
      setAuditLogs([]);
      setAuditHasMore(false);
    } else {
      const logs = (Array.isArray(data) ? data : []) as typeof auditLogs;
      setAuditLogs(logs);
      setAuditHasMore(logs.length === pageSize);
      setAuditPageNumber(pageNumber);

      const auditIdFromUrl = new URLSearchParams(window.location.search).get('auditId');
      if (auditIdFromUrl) {
        const matchingLog = logs.find((log) => log.id === auditIdFromUrl);
        if (matchingLog) setSelectedAuditLog(matchingLog);
      }
    }

    setAuditLoading(false);
  }

  function openDashboard(pushHistory = true) {
    if (pushHistory) pushNavigation('dashboard');
    setSelectedRestaurant(null);
    setAccountMenuOpen(false);
    setAdminPage('dashboard');
    void loadDashboard();
  }

  function openRestaurants(pushHistory = true) {
    if (pushHistory) pushNavigation('restaurants');
    setSelectedRestaurant(null);
    setAccountMenuOpen(false);
    setAdminPage('restaurants');
    void loadRestaurants();
  }

  function openTotpReset(pushHistory = true) {
    if (adminAccessLevel == null) return;
    if (pushHistory) pushNavigation('totp-reset');
    setAccountMenuOpen(false);
    setSelectedRestaurant(null);
    setSelectedAuditLog(null);
    setAdminPage('totp-reset');
    void loadTotpResetAccounts();
  }

  function openAuditLogs(pushHistory = true) {
    if (pushHistory) pushNavigation('audit');
    setSelectedAuditLog(null);
    setSelectedRestaurant(null);
    setAdminPage('audit');
    setAuditPageNumber(0);
    void loadAuditLogs(0);
  }

  function openAuditLog(log: typeof auditLogs[number]) {
    pushNavigation('audit', { auditId: log.id });
    setSelectedRestaurant(null);
    setAdminPage('audit');
    setSelectedAuditLog(log);
    setAuditPageNumber(0);
  }

  async function loadRestaurants() {
    setRestaurantLoading(true);
    setRestaurantError('');

    const { data, error } = await fetchRestaurants();

    if (error) {
      setRestaurantError(error.message);
      setRestaurants([]);
    } else {
      setRestaurants((data ?? []) as Restaurant[]);
    }

    setRestaurantLoading(false);
  }

  useEffect(() => {
    if (!authorized) return;

    void loadRestaurants();

    const channel = supabase
      .channel('system-admin-restaurants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurants' },
        (payload) => {
          const newRow = payload.new as Restaurant;
          const oldRow = payload.old as Restaurant;

          setRestaurants((current) => {
            if (payload.eventType === 'INSERT') {
              if (current.some((restaurant) => restaurant.id === newRow.id)) return current;
              return [newRow, ...current];
            }

            if (payload.eventType === 'UPDATE') {
              return current
                .map((restaurant) => restaurant.id === newRow.id ? newRow : restaurant)
                .sort((a, b) => b.created_at.localeCompare(a.created_at));
            }

            if (payload.eventType === 'DELETE') {
              return current.filter((restaurant) => restaurant.id !== oldRow.id);
            }

            return current;
          });

          if (payload.eventType === 'UPDATE' && selectedRestaurant?.id === newRow.id) {
            setSelectedRestaurant(newRow);
          }

          if (payload.eventType === 'DELETE' && selectedRestaurant?.id === oldRow.id) {
            setSelectedRestaurant(null);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authorized, selectedRestaurant?.id]);

  useEffect(() => {
    if (!authorized || adminPage !== 'audit') return;
    setAuditPageNumber(0);
    void loadAuditLogs(0);
  }, [authorized, adminPage, auditSearch, auditEventFilter, auditDatePreset, auditStartDate, auditEndDate]);

  useEffect(() => {
    if (!authorized) return;

    const navigation = getNavigationFromUrl();
    const params = new URLSearchParams(window.location.search);

    if (!params.get('page')) {
      params.set('page', 'dashboard');
      window.history.replaceState({}, '', `?${params.toString()}`);
    }

    applyNavigationFromUrl();

    const handlePopState = () => {
      const current = getNavigationFromUrl();

      if (current.page === 'restaurant' && current.restaurantId) {
        const restaurant = restaurantsRef.current.find((item) => item.id === current.restaurantId);
        if (restaurant) {
          openRestaurant(restaurant, false);
          return;
        }
        void loadRestaurants();
        return;
      }

      setSelectedAuditLog(null);
      setSelectedRestaurant(null);
      setAdminPage(current.page === 'restaurant' ? 'restaurants' : current.page);

      if (current.page === 'dashboard') void loadDashboard();
      if (current.page === 'restaurants') void loadRestaurants();
      if (current.page === 'audit') {
        setAuditPageNumber(0);
        void loadAuditLogs(0);
        if (current.auditId) {
          const log = auditLogsRef.current.find((item) => item.id === current.auditId);
          if (log) setSelectedAuditLog(log);
        }
      }
      if (current.page === 'administrators' && adminAccessLevelRef.current === 'owner') void loadAdministrators();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authorized]);

  useEffect(() => {
    if (!authorized || adminPage !== 'dashboard') return;
    void loadDashboard();
  }, [authorized, adminPage]);

  const filteredAuditLogs = auditLogs;

  function resetAuditFiltersAndReload() {
    setAuditPageNumber(0);
    void loadAuditLogs(0);
  }

  function exportAuditLogs() {
    exportAuditLogsCsv(filteredAuditLogs);
  }

  const filteredRestaurants = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return restaurants;

    return restaurants.filter((restaurant) =>
      [restaurant.name, restaurant.slug, restaurant.restaurant_address ?? '', restaurant.email ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [restaurants, search]);

  if (loading) return <main className="screen-center">Loading...</main>;

  if (inviteSetup) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <img className="company-logo auth-logo" src="https://xaihajwrsvcdjisezmmc.supabase.co/storage/v1/object/public/web2table-assets/web2table.png" alt="WEB2TABLE" />
          <div className="eyebrow">WEB2TABLE Platform</div>
          <h1>Set up your account</h1>
          <p>You have been invited as a System Administrator. Create your password to activate your account.</p>
          <form noValidate onSubmit={(event) => { event.preventDefault(); void completeSystemAdminInvitation(); }}>
            <label>
              Password
              <span className="password-input-wrap">
                <input
                  type={showInvitePassword ? 'text' : 'password'}
                  value={invitePassword}
                  onChange={(event) => setInvitePassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  className="password-visibility-toggle"
                  type="button"
                  onClick={() => setShowInvitePassword((visible) => !visible)}
                  aria-label={showInvitePassword ? 'Hide password' : 'Show password'}
                  title={showInvitePassword ? 'Hide password' : 'Show password'}
                >
                  {showInvitePassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.8 4.2 10 7-.5 1.2-1.4 2.7-2.8 4M6.2 6.3C3.9 7.7 2.5 10 2 12c1.2 2.8 4.8 7 10 7 1.2 0 2.4-.3 3.4-.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                  )}
                </button>
              </span>
            </label>
            <label>
              Confirm password
              <span className="password-input-wrap">
                <input
                  type={showInvitePasswordConfirm ? 'text' : 'password'}
                  value={invitePasswordConfirm}
                  onChange={(event) => setInvitePasswordConfirm(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  className="password-visibility-toggle"
                  type="button"
                  onClick={() => setShowInvitePasswordConfirm((visible) => !visible)}
                  aria-label={showInvitePasswordConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  title={showInvitePasswordConfirm ? 'Hide password' : 'Show password'}
                >
                  {showInvitePasswordConfirm ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.8 4.2 10 7-.5 1.2-1.4 2.7-2.8 4M6.2 6.3C3.9 7.7 2.5 10 2 12c1.2 2.8 4.8 7 10 7 1.2 0 2.4-.3 3.4-.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                  )}
                </button>
              </span>
            </label>
            {inviteSetupError && <div className="error-banner" role="alert" aria-live="assertive">{inviteSetupError}</div>}
            <button
              type="button"
              disabled={inviteSettingPassword}
              onClick={() => {
                // Call setup directly from the click; do not depend on form submission.
                void completeSystemAdminInvitation();
              }}
            >
              {inviteSettingPassword ? 'Creating password...' : 'Create password'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="auth-shell">
        {authDialogMessage && (
          <div className="auth-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthDialogMessage(''); }}>
            <section className="auth-dialog" role="alertdialog" aria-modal="true" aria-labelledby="auth-dialog-title" aria-describedby="auth-dialog-description">
              <div className="auth-dialog-mark" aria-hidden="true">!</div>
              <div className="eyebrow">WEB2TABLE Platform</div>
              <h2 id="auth-dialog-title">Unable to sign in</h2>
              <p id="auth-dialog-description">{authDialogMessage}</p>
              <button type="button" autoFocus onClick={() => setAuthDialogMessage('')}>OK</button>
            </section>
          </div>
        )}
        <section className="auth-card auth-login-card">
          <img className="company-logo auth-logo" src="https://xaihajwrsvcdjisezmmc.supabase.co/storage/v1/object/public/web2table-assets/web2table.png" alt="WEB2TABLE" />
          <div className="eyebrow">WEB2TABLE PLATFORM</div>
          <h1>Welcome back.</h1>
          <p>Sign in to manage your restaurants and platform settings.</p>
          <form onSubmit={signIn}>
            <label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" aria-label="Email address" autoComplete="email" required />
            </label>
            <label>
              <span className="password-input-wrap"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" aria-label="Password" autoComplete="current-password" required /><button className="password-visibility-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="M4 4 20 20" />}</svg></button></span>
            </label>
            <button type="submit">Sign in</button>
          </form>
        </section>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="eyebrow">WEB2TABLE Platform</div>
          <h1>Access denied</h1>
          <p>Your account is signed in but is not authorized as a System Administrator.</p>
          <button onClick={signOut}>Sign out</button>
        </section>
      </main>
    );
  }

  if (isAdminPage(adminPage, 'totp-reset')) {
    return (
      <div className="admin-layout">
        <SystemAdminSidebar activePage="totp-reset" accessLevel={adminAccessLevel} onDashboard={() => openDashboard()} onRestaurants={() => openRestaurants()} onAdministrators={() => openAdministrators()} onAuditLogs={() => openAuditLogs()} onPlatformHealth={() => openPlatformHealth()} onMapboxUsage={() => openMapboxUsage()} onTotpResets={() => openTotpReset()} onSignOut={() => void signOut()} />
        <main className="admin-main">
          <header className="workspace-topbar"><div><span className="topbar-kicker">ACCOUNT SECURITY</span><strong>TOTP Reset</strong></div><div className="topbar-right"><span className="topbar-status">{currentUserEmail}</span><button type="button" className="header-sign-out header-sign-out-icon" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}>↗</button></div></header>
          <TotpResetPage
            canReset={adminAccessLevel === 'owner' || adminAccessLevel === 'administrator'}
            accounts={totpResetAccounts}
            loading={totpResetLoading}
            search={totpResetSearch}
            onSearchChange={setTotpResetSearch}
            error={totpResetError}
            staffActionId={staffActionId}
            onRequestReset={(account) => void resetRestaurantUserTotp(account.userId, account.displayName, account.role, account.restaurantId)}
            pendingReset={pendingTotpReset}
            success={totpResetSuccess}
            actionError={staffActionError}
            onCloseConfirmation={() => setPendingTotpReset(null)}
            onConfirmReset={() => {
              if (!pendingTotpReset) return;
              void resetRestaurantUserTotp(pendingTotpReset.userId, pendingTotpReset.displayName, pendingTotpReset.role, pendingTotpReset.restaurantId, true);
            }}
            onDone={() => { setPendingTotpReset(null); setTotpResetSuccess(''); }}
          />
        </main>
        {renderRestaurantDeleteModal()}
      </div>
    );
  }  if (isAdminPage(adminPage, 'health')) {
    return <PlatformHealthPage onBack={() => openDashboard()} onRestaurants={() => openRestaurants()} onAdministrators={() => openAdministrators()} onAuditLogs={() => openAuditLogs()} onMapboxUsage={() => openMapboxUsage()} onTotpResets={() => openTotpReset()} accessLevel={adminAccessLevel} onSignOut={() => void signOut()} />;
  }

  if (isAdminPage(adminPage, 'maps')) {
    return <MapboxUsagePage onBack={() => openDashboard()} onRestaurants={() => openRestaurants()} onAdministrators={() => openAdministrators()} onAuditLogs={() => openAuditLogs()} onPlatformHealth={() => openPlatformHealth()} onTotpResets={() => openTotpReset()} accessLevel={adminAccessLevel} onSignOut={() => void signOut()} />
  }

  if (isAdminPage(adminPage, 'dashboard')) {
    return (
      <div className="admin-layout">
        <SystemAdminSidebar activePage={'dashboard'} accessLevel={adminAccessLevel} onDashboard={() => openDashboard()} onRestaurants={() => openRestaurants()} onAdministrators={() => openAdministrators()} onAuditLogs={() => openAuditLogs()} onPlatformHealth={() => openPlatformHealth()} onMapboxUsage={() => openMapboxUsage()} onTotpResets={() => openTotpReset()} onSignOut={() => void signOut()} />
        <div className="admin-main">
          <header className="workspace-topbar">
            <div><span className="topbar-kicker">WEB2TABLE PLATFORM</span><strong>System overview</strong></div>
            <div className="topbar-right"><span className="topbar-status"><span className="sidebar-online-dot" />Live updates</span><span className="header-account-email">{currentUserEmail}</span><button type="button" className="header-sign-out header-sign-out-icon" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}>↗</button></div>
          </header>
          {accountMenuOpen && (
            <div className="account-menu">
              <div className="account-menu-header"><span>System Administrator</span><strong>{adminAccessLevel === 'owner' ? 'Owner' : adminAccessLevel === 'administrator' ? 'Administrator — Full Access' : 'View Only'}</strong></div>
              {adminAccessLevel === 'owner' && <button className="account-menu-item" onClick={() => openAdministrators()}>System Administrators</button>}
              <button type="button" className="account-menu-item" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void signOut(); }}>Sign out</button>
            </div>
          )}
          <main className="admin-workspace">
        <DashboardPage
          error={dashboardError}
          loading={dashboardLoading}
          summary={dashboardSummary}
          platformHealth={dashboardPlatformHealth}
          restaurantMonitoring={dashboardRestaurantMonitoring}
          recentLogs={dashboardRecentLogs}
          canManageAdministrators={adminAccessLevel === 'owner'}
          onOpenPlatformHealth={() => openPlatformHealth()}
          onOpenRestaurants={() => openRestaurants()}
          onOpenAdministrators={() => openAdministrators()}
          onOpenAuditLogs={() => openAuditLogs()}
          onOpenAuditLog={(log) => openAuditLog(log as typeof auditLogs[number])}
        />
          </main>
        </div>
      </div>
    );
  }

  if (isAdminPage(adminPage, 'administrators')) {
    return (
      <div className="admin-layout">
      <SystemAdminSidebar activePage={'administrators'} accessLevel={adminAccessLevel} onDashboard={() => openDashboard()} onRestaurants={() => openRestaurants()} onAdministrators={() => openAdministrators()} onAuditLogs={() => openAuditLogs()} onPlatformHealth={() => openPlatformHealth()} onMapboxUsage={() => openMapboxUsage()} onTotpResets={() => openTotpReset()} onSignOut={() => void signOut()} />
      <div className="admin-main">
      <header className="workspace-topbar">
        <div><span className="topbar-kicker">WEB2TABLE PLATFORM</span><strong>System administrators</strong></div>
        <div className="topbar-right"><span className="topbar-status"><span className="sidebar-online-dot" />Live updates</span><span className="header-account-email">{currentUserEmail}</span><button type="button" className="header-sign-out header-sign-out-icon" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}>↗</button></div>
      </header>
      <main className="admin-shell admin-shell-with-sidebar">
       {accountMenuOpen && (
          <div className="account-menu">
            <div className="account-menu-header"><span>System Administrator</span><strong>{adminAccessLevel === 'owner' ? 'Owner' : adminAccessLevel === 'administrator' ? 'Administrator — Full Access' : 'View Only'}</strong></div>
            <button className="account-menu-item" onClick={() => setAccountMenuOpen(false)}>System Administrators</button>
            <button className="account-menu-item" onClick={signOut}>Sign out</button>
          </div>
        )}
        <AdministratorsPage
          canManage={adminAccessLevel === 'owner'}
          administrators={administrators}
          search={administratorSearch}
          onSearchChange={setAdministratorSearch}
          loading={administratorsLoading}
          error={administratorsError}
          success={inviteAdminSuccess}
          onOpenInvite={() => { setInviteAdminError(''); setInviteAdminSuccess(''); setShowInviteAdmin(true); }}
          pendingAction={pendingAdminAction}
          actionSaving={adminActionSaving}
          onRequestAction={setPendingAdminAction}
          onCloseAction={() => setPendingAdminAction(null)}
          onConfirmAction={() => void confirmAdministratorAction()}
          showInvite={showInviteAdmin}
          inviteName={inviteAdminName}
          onInviteNameChange={setInviteAdminName}
          inviteEmail={inviteAdminEmail}
          onInviteEmailChange={setInviteAdminEmail}
          inviteAccessLevel={inviteAdminAccessLevel}
          onInviteAccessLevelChange={setInviteAdminAccessLevel}
          inviteSaving={inviteAdminSaving}
          inviteError={inviteAdminError}
          onSubmitInvite={inviteAdministrator}
          onCloseInvite={() => setShowInviteAdmin(false)}
          confirmationEmail={inviteAdminConfirmationEmail}
          onCloseInviteConfirmation={() => setInviteAdminConfirmationEmail('')}
        />
      </main></div></div>
    );
  }

  if (isAdminPage(adminPage, 'audit')) {
    return (

      <div className="admin-layout">
      <SystemAdminSidebar activePage={'audit'} accessLevel={adminAccessLevel} onDashboard={() => openDashboard()} onRestaurants={() => openRestaurants()} onAdministrators={() => openAdministrators()} onAuditLogs={() => openAuditLogs()} onPlatformHealth={() => openPlatformHealth()} onMapboxUsage={() => openMapboxUsage()} onTotpResets={() => openTotpReset()} onSignOut={() => void signOut()} />
      <div className="admin-main">
      <header className="workspace-topbar">
        <div><span className="topbar-kicker">WEB2TABLE PLATFORM</span><strong>Activity logs</strong></div>
        <div className="topbar-right"><span className="topbar-status"><span className="sidebar-online-dot" />Administration</span></div>
      </header>
      <main className="admin-shell admin-shell-with-sidebar">
        {accountMenuOpen && (
          <div className="account-menu">
            <div className="account-menu-header"><span>System Administrator</span><strong>{adminAccessLevel === 'owner' ? 'Owner' : adminAccessLevel === 'administrator' ? 'Administrator — Full Access' : 'View Only'}</strong></div>
            {adminAccessLevel === 'owner' && <button className="account-menu-item" onClick={() => openAdministrators()}>System Administrators</button>}
            <button className="account-menu-item" onClick={signOut}>Sign out</button>
          </div>
        )}

        <AuditLogsPage
          logs={auditLogs}
          filteredLogs={filteredAuditLogs}
          search={auditSearch}
          setSearch={setAuditSearch}
          eventFilter={auditEventFilter}
          setEventFilter={setAuditEventFilter}
          datePreset={auditDatePreset}
          setDatePreset={setAuditDatePreset}
          startDate={auditStartDate}
          setStartDate={setAuditStartDate}
          endDate={auditEndDate}
          setEndDate={setAuditEndDate}
          onExport={exportAuditLogs}
          error={auditError}
          loading={auditLoading}
          pageNumber={auditPageNumber}
          onLoadPage={(page) => void loadAuditLogs(page)}
          hasMore={auditHasMore}
          onOpenLog={(log) => openAuditLog(log as typeof auditLogs[number])}
        />
      </main></div></div>
    );
  }


  {selectedAuditLog && (
    <div className="modal-backdrop audit-detail-backdrop" role="presentation">
      <section className="modal-card audit-detail-modal" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title">
        <div className="modal-heading">
          <div><div className="eyebrow">Audit Event</div><h2 id="audit-detail-title">Event details</h2></div>
          <button className="icon-button" type="button" onClick={() => { if (new URLSearchParams(window.location.search).get('auditId')) window.history.back(); else setSelectedAuditLog(null); }} aria-label="Close">×</button>
        </div>
        <div className="audit-detail-grid">
          <div><span>Date &amp; Time</span><strong>{new Date(selectedAuditLog.created_at).toLocaleString()}</strong></div>
          <div><span>Administrator</span><strong>{selectedAuditLog.admin_name || selectedAuditLog.admin_email || 'Unknown administrator'}</strong></div>
          <div><span>Restaurant</span><strong>{selectedAuditLog.restaurant_name || '—'}</strong></div>
          <div><span>Event</span><strong>{selectedAuditLog.event_type}</strong></div>
          <div><span>Action</span><strong>{selectedAuditLog.action}</strong></div>
          <div><span>Entity</span><strong>{selectedAuditLog.entity_type || '—'}</strong></div>
        </div>
        <div className="audit-json-panel"><div className="eyebrow">Recorded details</div><pre>{JSON.stringify(selectedAuditLog.details ?? {}, null, 2)}</pre></div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { if (new URLSearchParams(window.location.search).get('auditId')) window.history.back(); else setSelectedAuditLog(null); }}>Close</button></div>
      </section>
    </div>
  )}

  function openRestaurant(restaurant: Restaurant, pushHistory = true) {
    if (pushHistory) pushNavigation('restaurant', { restaurantId: restaurant.id });
    setSelectedRestaurant(restaurant);
    setAdminPage('restaurants');
    setManageTab('overview');
    setRestaurantPackageId(null);
    setRestaurantPackageRows([]);
    setPackageError('');
    setOwnerEmail('');
    setOwnerName('');
    setOwnerUserId('');
    setOwnerError('');
    setDomain('');
    setDomainError('');
    setSettingsError('');
    setRestaurantError('');
  }

  function closeRestaurant(pushHistory = true) {
    if (pushHistory) pushNavigation('restaurants');
    setSelectedRestaurant(null);
  }

  async function toggleRestaurant(restaurant: Restaurant) {
    const nextStatus = !restaurant.is_active;
    setRestaurantError('');

    const { error } = await updateRestaurantActiveStatus(restaurant.id, nextStatus);

    if (error) {
      setRestaurantError(error.message);
      return;
    }

    await recordAdminAudit(
      nextStatus ? 'Restaurant activated' : 'Restaurant deactivated',
      restaurant.id,
      'restaurant',
      restaurant.id,
      {
        name: restaurant.name,
        previous_status: restaurant.is_active ? 'active' : 'inactive',
        new_status: nextStatus ? 'active' : 'inactive',
      },
    );

    await loadRestaurants();
  }

  function requestDeleteRestaurant(restaurant: Restaurant) {
    if (restaurantDeleteSaving) return;
    setRestaurantError('');
    setPendingDeleteRestaurant(restaurant);
  }

  async function confirmDeleteRestaurant() {
    if (!pendingDeleteRestaurant || restaurantDeleteSaving) return;

    const restaurant = pendingDeleteRestaurant;
    setRestaurantDeleteSaving(true);
    setRestaurantError('');

    try {
      const { data, error } = await deleteRestaurantService(restaurant.id);

      if (error) {
        setRestaurantError(error.message);
        return;
      }

      if (data?.error) {
        setRestaurantError(String(data.error));
        return;
      }

      await recordAdminAudit(
        'Restaurant deleted',
        null,
        'restaurant',
        restaurant.id,
        {
          name: restaurant.name,
          slug: restaurant.slug,
          owner_id: restaurant.owner_id,
        },
      );

      if (selectedRestaurant?.id === restaurant.id) {
        closeRestaurant(false);
      }

      setPendingDeleteRestaurant(null);
      await loadRestaurants();
    } finally {
      setRestaurantDeleteSaving(false);
    }
  }

  function renderRestaurantDeleteModal() {
    if (!pendingDeleteRestaurant) return null;

    return createPortal(
      <div className="modal-backdrop restaurant-delete-confirm-backdrop" role="presentation">
        <section className="modal-card restaurant-delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="restaurant-delete-title">
          <div className="modal-heading">
            <div>
              <div className="eyebrow">Delete Restaurant</div>
              <h2 id="restaurant-delete-title">Delete this restaurant?</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => setPendingDeleteRestaurant(null)} disabled={restaurantDeleteSaving} aria-label="Close">×</button>
          </div>
          <div className="restaurant-delete-confirm-content">
            <p>You are about to permanently delete <strong>{pendingDeleteRestaurant.name}</strong>.</p>
            <div className="restaurant-delete-confirm-warning">
              <strong>This removes the restaurant from the platform and deletes its tenant owner Auth account when that account is no longer used by another restaurant or invitation.</strong>
              <span>This action cannot be undone. Restaurants with existing orders or pending online payments will be blocked from deletion.</span>
            </div>
            {restaurantError && <div className="error-banner">{restaurantError}</div>}
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setPendingDeleteRestaurant(null)} disabled={restaurantDeleteSaving}>Cancel</button>
            <button type="button" className="danger-button" onClick={() => void confirmDeleteRestaurant()} disabled={restaurantDeleteSaving}>
              {restaurantDeleteSaving ? 'Deleting...' : 'Confirm & Delete'}
            </button>
          </div>
        </section>
      </div>,
      document.body,
    );
  }

  if (selectedRestaurant) {
    return (
      <main className="admin-shell">
        

        {accountMenuOpen && (
          <div className="account-menu">
            <div className="account-menu-header"><span>System Administrator</span><strong>{adminAccessLevel === 'owner' ? 'Owner' : adminAccessLevel === 'administrator' ? 'Administrator — Full Access' : 'View Only'}</strong></div>
            {adminAccessLevel === 'owner' && <button className="account-menu-item" onClick={() => openAdministrators()}>System Administrators</button>}
            <button className="account-menu-item" onClick={signOut}>Sign out</button>
          </div>
        )}

        <RestaurantDetailsPage
          restaurant={selectedRestaurant}
          canManage={canManage}
          manageTab={manageTab}
          onSelectTab={setManageTab}
          onClose={() => openRestaurants()}
          onLoadOwner={() => void loadRestaurantOwner(selectedRestaurant.id)}
          onSelectDomain={() => { setDomain(selectedRestaurant.custom_domain ?? ''); setDomainError(''); }}
          onLoadSettings={() => void loadRestaurantSettings(selectedRestaurant.id)}
          onLoadStaff={() => void loadRestaurantStaff(selectedRestaurant.id)}
          onLoadPackage={() => void loadRestaurantPackage(selectedRestaurant.id)}
          onRequestStatusChange={() => setPendingRestaurantStatus(selectedRestaurant)}
          owner={{ loading: ownerLoading, ownerUserId, ownerName, ownerEmail, ownerSaving, error: ownerError }}
          onOwnerEmailChange={setOwnerEmail}
          onRequestAssignOwner={() => { setOwnerError(''); setPendingAssignOwner(true); }}
          onRequestRemoveOwner={() => { setOwnerError(''); setPendingRemoveOwner(true); }}
          domain={domain}
          onDomainChange={setDomain}
          domainSaving={domainSaving}
          domainError={domainError}
          onRequestSaveDomain={() => { setDomainError(''); setPendingSaveDomain(true); }}
          packageState={{ packageLoading, packageSaving, packageError, restaurantPackageId, restaurantPackageRows }}
          onAssignPackage={(packageId) => void assignRestaurantPackage(packageId)}
          onSetModuleEnabled={(moduleKey, enabled) => void setRestaurantModuleEnabled(moduleKey, enabled)}
          staffState={{ staffLoading, staffError, restaurantStaff, staffActionError, staffActionId }}
          onSetStaffActive={(staffId, isActive) => void setRestaurantStaffActive(staffId, isActive)}
          onRequestDeleteStaff={requestDeleteRestaurantStaff}
          settingsState={{ settingsLoading, vatRegistered, vatRate, pricesVatInclusive, cashOnDeliveryEnabled, cashOnPickupEnabled, cashOnTakeOutEnabled, automaticRiderAssignmentEnabled, onlinePaymentsEnabled, settingsError, settingsSaving, taxpayerProfileLoading, taxpayerProfile, taxpayerProfileError, taxpayerProfileMessage, taxpayerProfileSaving, birReadinessLoading, birReadiness, birReadinessError, invoiceSeriesSaving, invoiceSeriesError, invoiceSeriesMessage }}
          onVatRegisteredChange={setVatRegistered}
          onVatRateChange={setVatRate}
          onPricesVatInclusiveChange={setPricesVatInclusive}
          onCashOnDeliveryChange={setCashOnDeliveryEnabled}
          onCashOnPickupChange={setCashOnPickupEnabled}
           onCashOnTakeOutChange={setCashOnTakeOutEnabled}
          onAutomaticRiderAssignmentChange={setAutomaticRiderAssignmentEnabled}
          onOnlinePaymentsEnabledChange={setOnlinePaymentsEnabled}
          onTaxpayerProfileChange={setTaxpayerProfile}
          onRequestReviewTaxpayerProfile={() => void saveTaxpayerProfileReview()}
          onConfigureDisabledInvoiceSeries={(input) => void saveDisabledInvoiceSeries(input)}
          onRequestSaveSettings={() => setPendingSaveSettings(true)}
        />
          {pendingRestaurantStatus && (
            <div className="modal-backdrop restaurant-status-confirm-backdrop" role="presentation">
              <section className="modal-card restaurant-status-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="restaurant-status-title">
                <div className="modal-heading">
                  <div>
                    <div className="eyebrow">{pendingRestaurantStatus.is_active ? 'Deactivate Restaurant' : 'Activate Restaurant'}</div>
                    <h2 id="restaurant-status-title">{pendingRestaurantStatus.is_active ? 'Deactivate this restaurant?' : 'Activate this restaurant?'}</h2>
                  </div>
                  <button className="icon-button" type="button" onClick={() => setPendingRestaurantStatus(null)} aria-label="Close">×</button>
                </div>
                <div className="restaurant-status-confirm-content">
                  <p>You are about to <strong>{pendingRestaurantStatus.is_active ? 'deactivate' : 'activate'}</strong> <strong>{pendingRestaurantStatus.name}</strong>.</p>
                  <div className="restaurant-status-confirm-warning">
                    <strong>{pendingRestaurantStatus.is_active ? 'Customers will no longer be able to access this restaurant.' : 'Customers will be able to access this restaurant again.'}</strong>
                    <span>This changes the restaurant's platform access status.</span>
                  </div>
                  {restaurantError && <div className="error-banner">{restaurantError}</div>}
                </div>
                <div className="modal-actions">
                  <button type="button" className="secondary-button" onClick={() => setPendingRestaurantStatus(null)}>Cancel</button>
                  <button
                    type="button"
                    className={pendingRestaurantStatus.is_active ? 'danger-button' : ''}
                    onClick={async () => {
                      const restaurant = pendingRestaurantStatus;
                      await toggleRestaurant(restaurant);
                      const { data } = await fetchRestaurantById(restaurant.id);
                      if (data) setSelectedRestaurant(data as Restaurant);
                      setPendingRestaurantStatus(null);
                    }}
                  >
                    {pendingRestaurantStatus.is_active ? 'Confirm & Deactivate' : 'Confirm & Activate'}
                  </button>
                </div>
              </section>
            </div>
          )}

          {renderRestaurantDeleteModal()}

          {pendingSaveDomain && (
            <RestaurantDomainConfirmation
              restaurantName={selectedRestaurant?.name ?? ''}
              domain={domain}
              domainSaving={domainSaving}
              domainError={domainError}
              onClose={() => setPendingSaveDomain(false)}
              onConfirm={() => void saveDomain()}
            />
          )}

          {pendingSaveSettings && (
            <RestaurantSettingsConfirmation
              restaurantName={selectedRestaurant?.name ?? ''}
              settingsSaving={settingsSaving}
              settingsError={settingsError}
              onClose={() => setPendingSaveSettings(false)}
              onConfirm={() => void saveRestaurantSettings()}
            />
          )}

          {pendingAssignOwner && (
            <RestaurantOwnerAssignmentConfirmation
              restaurantName={selectedRestaurant?.name ?? ''}
              ownerEmail={ownerEmail}
              ownerSaving={ownerSaving}
              ownerError={ownerError}
              onClose={() => setPendingAssignOwner(false)}
              onConfirm={() => void assignOwner()}
            />
          )}

          {ownerInvitationNotice && (
            <div className="modal-backdrop owner-confirm-backdrop" role="presentation">
              <section className="modal-card owner-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="owner-invitation-title">
                <div className="modal-heading">
                  <div>
                    <div className="eyebrow">Invitation Sent</div>
                    <h2 id="owner-invitation-title">Owner invitation sent</h2>
                  </div>
                  <button className="icon-button" type="button" onClick={() => setOwnerInvitationNotice('')} aria-label="Close">×</button>
                </div>
                <div className="owner-confirm-content">
                  <p>{ownerInvitationNotice}</p>
                  <div className="owner-confirm-warning">
                    <strong>Next step</strong>
                    <span>Ask the owner to check their inbox, including the spam or junk folder, and follow the invitation instructions.</span>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setOwnerInvitationNotice('')}>Got it</button>
                </div>
              </section>
            </div>
          )}

          {pendingRemoveOwner && (
            <div className="modal-backdrop owner-confirm-backdrop" role="presentation">
              <section className="modal-card owner-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="remove-owner-title">
                <div className="modal-heading">
                  <div>
                    <div className="eyebrow">Remove Owner</div>
                    <h2 id="remove-owner-title">Remove this owner?</h2>
                  </div>
                  <button className="icon-button" type="button" onClick={() => setPendingRemoveOwner(false)} disabled={ownerSaving} aria-label="Close">×</button>
                </div>
                <div className="owner-confirm-content">
                  <p>You are about to remove <strong>{ownerEmail || ownerName || 'the current owner'}</strong> as the owner of <strong>{selectedRestaurant.name}</strong>.</p>
                  <div className="owner-confirm-warning">
                    <strong>This only removes the restaurant owner assignment.</strong>
                    <span>The Supabase Auth account will not be deleted.</span>
                  </div>
                  {ownerError && <div className="error-banner">{ownerError}</div>}
                </div>
                <div className="modal-actions">
                  <button type="button" className="secondary-button" onClick={() => setPendingRemoveOwner(false)} disabled={ownerSaving}>Cancel</button>
                  <button type="button" className="danger-button" onClick={() => void removeOwner()} disabled={ownerSaving}>{ownerSaving ? 'Removing...' : 'Confirm & Remove'}</button>
                </div>
              </section>
            </div>
          )}

          {pendingDeleteStaff && (
            <div className="modal-backdrop staff-delete-backdrop" role="presentation">
              <section className="modal-card staff-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-staff-title">
                <div className="modal-heading">
                  <div>
                    <div className="eyebrow">Delete Staff</div>
                    <h2 id="delete-staff-title">Delete {pendingDeleteStaff.name || 'staff member'}?</h2>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => setPendingDeleteStaff(null)}
                    disabled={staffActionId !== null}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="staff-delete-content">
                  <p>This permanently deletes the staff record and the associated Supabase Auth account.</p>
                  <div className="staff-delete-warning">
                    <strong>Only the System Administrator Owner can perform this action.</strong>
                    <span>Historical operational records are preserved where the database relationships allow it.</span>
                  </div>
                  {staffActionError && <div className="error-banner">{staffActionError}</div>}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setPendingDeleteStaff(null)}
                    disabled={staffActionId !== null}
                  >
                    Close
                  </button>
                  {staffActionError && pendingDeleteStaff.role === 'rider' ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        const staffId = pendingDeleteStaff.id;
                        setPendingDeleteStaff(null);
                        setStaffActionError('');
                        void setRestaurantStaffActive(staffId, false);
                      }}
                      disabled={staffActionId !== null}
                    >
                      Deactivate Instead
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void confirmDeleteRestaurantStaff()}
                      disabled={staffActionId !== null}
                    >
                      {staffActionId === pendingDeleteStaff.id ? 'Deleting...' : 'Delete Staff'}
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}

      </main>
    );
  }

  return (
    <AppShell
      sidebar={<SystemAdminSidebar activePage={adminPage} accessLevel={adminAccessLevel} onDashboard={() => openDashboard()} onRestaurants={() => openRestaurants()} onAdministrators={() => openAdministrators()} onAuditLogs={() => openAuditLogs()} onPlatformHealth={() => openPlatformHealth()} onMapboxUsage={() => openMapboxUsage()} onTotpResets={() => openTotpReset()} onSignOut={() => void signOut()} />}
      onSignOut={() => void signOut()}
      email={currentUserEmail}
      title={isAdminPage(adminPage, 'restaurants') ? 'Restaurant management' : isAdminPage(adminPage, 'administrators') ? 'System administrators' : 'Activity logs'}
    >
      <main className="admin-shell admin-shell-with-sidebar">
      

        {accountMenuOpen && (
          <div className="account-menu">
            <div className="account-menu-header"><span>System Administrator</span><strong>{adminAccessLevel === 'owner' ? 'Owner' : adminAccessLevel === 'administrator' ? 'Administrator — Full Access' : 'View Only'}</strong></div>
            {adminAccessLevel === 'owner' && <button className="account-menu-item" onClick={() => openAdministrators()}>System Administrators</button>}
            <button className="account-menu-item" onClick={signOut}>Sign out</button>
          </div>
        )}

      <RestaurantsPage
        restaurants={restaurants}
        filteredRestaurants={filteredRestaurants}
        search={search}
        onSearchChange={setSearch}
        accessLevel={adminAccessLevel}
        canManage={canManage}
        loading={restaurantLoading}
        error={restaurantError}
        onInviteTenant={() => { setInviteTenantError(''); setInviteTenantSuccess(''); setInviteTenantEmail(''); setShowInviteTenant(true); }}
        onManage={openRestaurant}
        onDelete={requestDeleteRestaurant}
      />

      {renderRestaurantDeleteModal()}

      {showInviteTenant && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="tenant-invite-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">Tenant onboarding</div>
                <h2 id="tenant-invite-title">Invite a tenant</h2>
              </div>
              {!inviteTenantSuccess && (
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setShowInviteTenant(false)}
                  disabled={inviteTenantSaving}
                  aria-label="Close invite tenant modal"
                  title="Close"
                >×</button>
              )}
            </div>

            <form className="restaurant-form" onSubmit={inviteTenant}>
              <p>
                Enter the new restaurant details and owner email. Web2Table will create the tenant
                and automatically send the owner a secure invitation email.
              </p>

              <div className="form-grid">
                <label>
                  Restaurant name
                  <input
                    value={inviteTenantRestaurantName}
                    onChange={(event) => {
                      const name = event.target.value;
                      setInviteTenantRestaurantName(name);
                      setInviteTenantSlug(
                        name
                          .normalize('NFKD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-+|-+$/g, ''),
                      );
                    }}
                    
                    disabled={inviteTenantSaving}
                  />
                </label>
                <label>
                  First name
                  <input
                    autoComplete="given-name"
                    value={inviteTenantFirstName}
                    onChange={(event) => setInviteTenantFirstName(event.target.value)}
                    required
                    disabled={inviteTenantSaving}
                  />
                </label>
                <label>
                  Last name
                  <input
                    autoComplete="family-name"
                    value={inviteTenantLastName}
                    onChange={(event) => setInviteTenantLastName(event.target.value)}
                    required
                    disabled={inviteTenantSaving}
                  />
                </label>
              </div>

              <div className="form-grid">

                <label>
                  Owner email
                  <input
                    type="email"
                    value={inviteTenantEmail}
                    onChange={(event) => setInviteTenantEmail(event.target.value)}
                    
                    required
                    disabled={inviteTenantSaving}
                  />
                </label>
              </div>

              {inviteTenantError && <div className="error-banner">{inviteTenantError}</div>}
              {inviteTenantSuccess && <div className="success-banner">{inviteTenantSuccess}</div>}
              <div className="modal-actions">
                {inviteTenantSuccess ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteTenant(false);
                      setInviteTenantSuccess('');
                      setInviteTenantError('');
                    }}
                  >
                    Done
                  </button>
                ) : (
                  <button type="submit" disabled={inviteTenantSaving}>
                    {inviteTenantSaving ? 'Sending invitation...' : 'Invite tenant'}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}

    </main>
    </AppShell>
  );
}

// Shared across StrictMode effect re-runs for the one-time invitation token.
let invitationVerification: ReturnType<typeof supabase.auth.verifyOtp> | undefined;

export default function App() {
  return (
    <SystemAdminMfaGate>
      <AppContent />
    </SystemAdminMfaGate>
  );
}
