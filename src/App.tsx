import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './lib/supabase';
import { type AdminPage } from './app/navigation';
import useAppNavigation from './app/useAppNavigation';
import DashboardOverview from './features/dashboard/DashboardOverview';
import AuditLogsPanel from './features/audit/AuditLogsPanel';
import TotpResetPanel from './features/totp-reset/TotpResetPanel';
import AdministratorsPanel from './features/administrators/AdministratorsPanel';
import RestaurantManagementHeader from './features/restaurants/RestaurantManagementHeader';
import RestaurantOverview from './features/restaurants/RestaurantOverview';
import RestaurantOwnerPanel from './features/restaurants/RestaurantOwnerPanel';
import RestaurantDomainPanel from './features/restaurants/RestaurantDomainPanel';
import RestaurantSettingsPanel from './features/restaurants/RestaurantSettingsPanel';
import RestaurantStaffPanel from './features/restaurants/RestaurantStaffPanel';
import RestaurantFormPanel from './features/restaurants/RestaurantFormPanel';
import RestaurantPackagePanel from './features/restaurants/RestaurantPackagePanel';
import RestaurantDomainConfirmation from './features/restaurants/RestaurantDomainConfirmation';
import RestaurantSettingsConfirmation from './features/restaurants/RestaurantSettingsConfirmation';
import RestaurantOwnerAssignmentConfirmation from './features/restaurants/RestaurantOwnerAssignmentConfirmation';
import PlatformHealthPage from './components/PlatformHealthPage';
import MapboxUsagePage from './components/MapboxUsagePage';
import SystemAdminMfaGate from './components/SystemAdminMfaGate';
import SystemAdminSidebar from './components/SystemAdminSidebar';

function isAdminPage(current: AdminPage, target: AdminPage) {
  return current === target;
}

type Restaurant = {
  id: string;
  owner_id: string | null;
  custom_domain: string | null;
  slug: string;
  name: string;
  tagline: string;
  logo_url: string | null;
  location_text: string | null;
  contact_number: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type RestaurantForm = {
  name: string;
  slug: string;
  tagline: string;
  logo_url: string;
  location_text: string;
  contact_number: string;
  email: string;
  is_active: boolean;
};

const emptyForm: RestaurantForm = {
  name: '',
  slug: '',
  tagline: '',
  logo_url: '',
  location_text: '',
  contact_number: '',
  email: '',
  is_active: true,
};

function AppContent() {
  const { getNavigationFromUrl, pushNavigation } = useAppNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminAccessLevel, setAdminAccessLevel] = useState<'owner' | 'administrator' | 'view_only' | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [administratorsLoading, setAdministratorsLoading] = useState(false);
  const [administratorSearch, setAdministratorSearch] = useState('');
  const [administratorsError, setAdministratorsError] = useState('');
  const [administrators, setAdministrators] = useState<Array<{
    id: string; admin_user_id: string; email: string | null; name: string | null;
    access_level: 'owner' | 'administrator' | 'view_only'; is_active: boolean;
    status: 'pending' | 'active' | 'revoked'; granted_by: string | null;
    granted_by_email: string | null; created_at: string; updated_at: string;
  }>>([]);
  const [pendingAdminAction, setPendingAdminAction] = useState<{
    type: 'revoke' | 'restore' | 'change' | 'delete';
    admin: typeof administrators[number];
    nextAccessLevel?: 'administrator' | 'view_only';
  } | null>(null);
  const [adminActionSaving, setAdminActionSaving] = useState(false);
  const [showInviteAdmin, setShowInviteAdmin] = useState(false);
  const [inviteAdminEmail, setInviteAdminEmail] = useState('');
  const [inviteAdminAccessLevel, setInviteAdminAccessLevel] = useState<'administrator' | 'view_only'>('administrator');
  const [inviteAdminSaving, setInviteAdminSaving] = useState(false);
  const [inviteAdminError, setInviteAdminError] = useState('');
  const [inviteAdminSuccess, setInviteAdminSuccess] = useState('');
  const [inviteAdminConfirmationEmail, setInviteAdminConfirmationEmail] = useState('');
  const [showInviteTenant, setShowInviteTenant] = useState(false);
  const [inviteTenantEmail, setInviteTenantEmail] = useState('');
  const [inviteTenantRestaurantName, setInviteTenantRestaurantName] = useState('');
  const [inviteTenantSlug, setInviteTenantSlug] = useState('');
  const [inviteTenantPackageId, setInviteTenantPackageId] = useState('1');
  const [inviteTenantSaving, setInviteTenantSaving] = useState(false);
  const [inviteTenantError, setInviteTenantError] = useState('');
  const [inviteTenantSuccess, setInviteTenantSuccess] = useState('');
  const [inviteSetup, setInviteSetup] = useState(false);
  const [invitePassword, setInvitePassword] = useState('');
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState('');
  const [inviteSetupError, setInviteSetupError] = useState('');
  const [inviteSettingPassword, setInviteSettingPassword] = useState(false);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [restaurantError, setRestaurantError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [form, setForm] = useState<RestaurantForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const canManage = adminAccessLevel === 'owner' || adminAccessLevel === 'administrator';
  const [manageTab, setManageTab] = useState<'overview' | 'owner' | 'domain' | 'settings' | 'staff' | 'package'>('overview');
  const [restaurantPackageId, setRestaurantPackageId] = useState<number | null>(null);
  const [restaurantPackageRows, setRestaurantPackageRows] = useState<Array<{
    package_id: number | null;
    package_key: string | null;
    package_name: string | null;
    package_description: string | null;
    subscription_status: string;
    module_key: string;
    module_name: string;
    included_by_package: boolean;
    override_enabled: boolean | null;
    effective_enabled: boolean;
  }>>([]);
  const [packageLoading, setPackageLoading] = useState(false);
  const [packageSaving, setPackageSaving] = useState(false);
  const [packageError, setPackageError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [restaurantStaff, setRestaurantStaff] = useState<Array<{ id: string; name: string; mobile_number: string; email: string; role: string; is_active: boolean; auth_user_id: string | null }>>([]);
  const [staffActionId, setStaffActionId] = useState<string | null>(null);
  const [pendingTotpReset, setPendingTotpReset] = useState<{ userId: string; displayName: string; role: 'restaurant_owner' | 'staff'; restaurantId: string } | null>(null);
  const [totpResetSuccess, setTotpResetSuccess] = useState('');
  const [staffActionError, setStaffActionError] = useState('');
  const [pendingDeleteStaff, setPendingDeleteStaff] = useState<typeof restaurantStaff[number] | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [pendingSaveSettings, setPendingSaveSettings] = useState(false);
  const [cashOnDeliveryEnabled, setCashOnDeliveryEnabled] = useState(true);
  const [automaticRiderAssignmentEnabled, setAutomaticRiderAssignmentEnabled] = useState(false);
  const [vatRegistered, setVatRegistered] = useState(false);
  const [pricesVatInclusive, setPricesVatInclusive] = useState(false);
  const [vatRate, setVatRate] = useState('12');
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
  const [pendingAssignOwner, setPendingAssignOwner] = useState(false);
  const [ownerInvitationNotice, setOwnerInvitationNotice] = useState('');
  const [pendingRemoveOwner, setPendingRemoveOwner] = useState(false);
  const [pendingRestaurantStatus, setPendingRestaurantStatus] = useState<Restaurant | null>(null);
  const [pendingDeleteRestaurant, setPendingDeleteRestaurant] = useState<Restaurant | null>(null);
  const [restaurantDeleteSaving, setRestaurantDeleteSaving] = useState(false);
  const [pendingRestaurantFormSave, setPendingRestaurantFormSave] = useState(false);
  const [adminPage, setAdminPage] = useState<AdminPage>('dashboard');
  const [totpResetAccounts, setTotpResetAccounts] = useState<Array<{userId:string; restaurantId:string; restaurantName:string; displayName:string; email:string; role:'restaurant_owner'|'staff'; staffRole?:string}>>([]);
  const [totpResetLoading, setTotpResetLoading] = useState(false);
  const [totpResetSearch, setTotpResetSearch] = useState('');
  const [totpResetError, setTotpResetError] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardSummary, setDashboardSummary] = useState<{ total_restaurants: number; active_restaurants: number; inactive_restaurants: number; active_system_administrators: number; pending_system_administrators: number; } | null>(null);
  const [dashboardRestaurantMonitoring, setDashboardRestaurantMonitoring] = useState<Array<{
    restaurant_id: string;
    restaurant_name: string;
    is_active: boolean;
    customer_accounts: number;
    customers_ordered_today: number;
    orders_today: number;
    processing_orders: number;
    last_activity: string | null;
    logged_in_now: number | null;
  }>>([]);
  const [dashboardRecentLogs, setDashboardRecentLogs] = useState<typeof auditLogs>([]);
  const [dashboardPlatformHealth, setDashboardPlatformHealth] = useState<{
    overallStatus: 'healthy' | 'degraded' | 'critical' | 'unknown';
    generatedAt: string;
    services: Array<{ key: string; name: string; status: 'healthy' | 'degraded' | 'critical' | 'unknown'; latencyMs: number | null; message: string }>;
    incidents: Array<{ severity: 'info' | 'warning' | 'critical'; service: string; title: string; summary: string; recommendation?: string }>;
    configurationWarnings: string[];
  } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditLogs, setAuditLogs] = useState<Array<{
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
  }>>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEventFilter, setAuditEventFilter] = useState('ALL');
  const [auditDatePreset, setAuditDatePreset] = useState<'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM'>('ALL');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditPageNumber, setAuditPageNumber] = useState(0);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<typeof auditLogs[number] | null>(null);
  const restaurantsRef = useRef(restaurants);
  const auditLogsRef = useRef(auditLogs);
  const adminAccessLevelRef = useRef(adminAccessLevel);
  restaurantsRef.current = restaurants;
  auditLogsRef.current = auditLogs;
  adminAccessLevelRef.current = adminAccessLevel;

  async function recordAuthAuditEvent(
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

  async function recordAdminAudit(
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

  function isSystemAdminInvitation() {
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return queryParams.get('type') === 'invite' || hashParams.get('type') === 'invite';
  }

  async function loadMyAccessLevel() {
    const { data, error } = await supabase.rpc('system_admin_get_my_access_level');
    if (error) {
      setAdminAccessLevel(null);
      return null;
    }

    const access = Array.isArray(data) ? data[0] : data;
    const level = access?.access_level as 'owner' | 'administrator' | 'view_only' | undefined;
    const isActive = access?.is_active === true;
    const isActiveStatus = access?.status === 'active';

    if (!level || !isActive || !isActiveStatus) {
      setAdminAccessLevel(null);
      return null;
    }

    setAdminAccessLevel(level);
    return level;
  }

  async function loadAdministrators() {
    setAdministratorsLoading(true);
    setAdministratorsError('');
    const { data, error } = await supabase.rpc('system_admin_get_administrators');
    if (error) {
      setAdministratorsError(error.message);
      setAdministrators([]);
    } else {
      setAdministrators((Array.isArray(data) ? data : []) as typeof administrators);
    }
    setAdministratorsLoading(false);
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
    } else if (navigation.page === 'administrators' && adminAccessLevel === 'owner') {
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
    if (adminAccessLevel !== 'owner') return;
    if (pushHistory) pushNavigation('administrators');
    setAccountMenuOpen(false);
    setAdminPage('administrators');
    setSelectedRestaurant(null);
    setInviteAdminError('');
    setInviteAdminSuccess('');
    setInviteAdminConfirmationEmail('');
    void loadAdministrators();
  }

  async function inviteAdministrator(event: FormEvent) {
    event.preventDefault();
    setInviteAdminSaving(true);
    setInviteAdminError('');
    setInviteAdminSuccess('');

    const { data, error } = await supabase.functions.invoke('web2table-invite-user', {
      body: {
        invitation_type: 'system_admin',
        email: inviteAdminEmail.trim(),
        access_level: inviteAdminAccessLevel,
      },
    });

    if (error) {
      let message = error.message;

      try {
        const response = (error as { context?: Response }).context;
        if (response) {
          const responseBody = await response.clone().json() as { error?: unknown };
          if (typeof responseBody.error === 'string' && responseBody.error.trim()) {
            message = responseBody.error;
          }
        }
      } catch {
        // Keep the original FunctionsHttpError message if the response body cannot be parsed.
      }

      setInviteAdminError(message);
      setInviteAdminSaving(false);
      return;
    }
    if (data?.error) {
      setInviteAdminError(String(data.error));
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
      const result = await supabase.rpc('system_admin_revoke_access', { p_admin_user_id: admin.admin_user_id });
      error = result.error;
    } else if (type === 'restore') {
      const result = await supabase.rpc('system_admin_restore_access', { p_admin_user_id: admin.admin_user_id });
      error = result.error;
    } else if (type === 'delete') {
      const result = await supabase.rpc('system_admin_delete_revoked_access', { p_admin_user_id: admin.admin_user_id });
      error = result.error;
    } else if (nextAccessLevel) {
      const result = await supabase.rpc('system_admin_set_access_level', {
        p_admin_user_id: admin.admin_user_id,
        p_access_level: nextAccessLevel,
      });
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

  async function checkAdminSession() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      setSignedIn(false);
      setAuthorized(false);
      setInviteSetup(false);
      setLoading(false);
      return false;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (sessionError) {
      console.error('Unable to establish System Administrator auth session:', sessionError);
      await supabase.auth.signOut();
      setSignedIn(false);
      setAuthorized(false);
      setLoading(false);
      return false;
    }

    setSignedIn(true);

    if (isSystemAdminInvitation()) {
      setInviteSetup(true);
      setInviteSetupError('');
      setLoading(false);
      return true;
    }

    const accessLevel = await loadMyAccessLevel();

    if (!accessLevel) {
      await supabase.auth.signOut();
      setSignedIn(false);
      setAuthorized(false);
      setLoading(false);
      return false;
    }

    setAuthorized(true);
    setInviteSetup(false);
    await loadDashboard(session.user.id);
    setLoading(false);
    return true;
  }

  async function completeSystemAdminInvitation(event: FormEvent) {
    event.preventDefault();
    setInviteSetupError('');

    if (invitePassword.length < 8) {
      setInviteSetupError('Your password must be at least 8 characters.');
      return;
    }

    if (invitePassword !== invitePasswordConfirm) {
      setInviteSetupError('The passwords do not match.');
      return;
    }

    setInviteSettingPassword(true);

    const { error: passwordError } = await supabase.auth.updateUser({
      password: invitePassword,
    });

    if (passwordError) {
      setInviteSetupError(passwordError.message);
      setInviteSettingPassword(false);
      return;
    }

    const { error: activationError } = await supabase.rpc(
      'system_admin_activate_my_pending_access',
    );

    if (activationError) {
      setInviteSetupError(activationError.message);
      setInviteSettingPassword(false);
      return;
    }

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname,
    );

    setInvitePassword('');
    setInvitePasswordConfirm('');
    setInviteSetup(false);
    setAuthorized(true);
    setInviteSettingPassword(false);
  }

  useEffect(() => {
    let active = true;

    checkAdminSession().then(() => {
      if (!active) return;
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setSignedIn(false);
        setAuthorized(false);
        setAdminAccessLevel(null);
        setAccountMenuOpen(false);
        setRestaurants([]);
        return;
      }

      setSignedIn(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      window.alert(error.message);
      return;
    }

    if (!signInData.session) {
      setLoading(false);
      window.alert('Sign in succeeded but no authenticated session was established.');
      return;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    });

    if (sessionError) {
      setLoading(false);
      window.alert(sessionError.message);
      return;
    }

    const accessLevel = await loadMyAccessLevel();

    if (!accessLevel) {
      await supabase.auth.signOut();
      setSignedIn(false);
      setAuthorized(false);
      setLoading(false);
      window.alert('This account does not have active System Administrator access.');
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

    const { data, error } = await supabase.rpc('system_admin_get_restaurant_package', {
      p_restaurant_id: restaurantId,
    });

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

    const { error } = await supabase.rpc('system_admin_assign_restaurant_package', {
      p_restaurant_id: selectedRestaurant.id,
      p_package_id: packageId,
    });

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

    const { error } = await supabase.rpc('system_admin_set_restaurant_module_override', {
      p_restaurant_id: selectedRestaurant.id,
      p_module_key: moduleKey,
      p_enabled: enabled,
    });

    if (error) {
      setPackageError(error.message);
    } else {
      await loadRestaurantPackage(selectedRestaurant.id);
    }

    setPackageSaving(false);
  }

  async function loadRestaurantSettings(restaurantId: string) {
    setSettingsLoading(true);
    setSettingsError('');

    const { data, error } = await supabase.rpc('system_admin_get_restaurant_settings', {
      p_restaurant_id: restaurantId,
    });

    if (error) {
      setSettingsError(error.message);
    } else {
      const settings = Array.isArray(data) ? data[0] : data;
      setCashOnDeliveryEnabled(settings?.cash_on_delivery_enabled ?? true);
      setAutomaticRiderAssignmentEnabled(settings?.automatic_rider_assignment_enabled ?? false);
      setVatRegistered(settings?.tax_vat_registered ?? false);
      setPricesVatInclusive(settings?.tax_prices_vat_inclusive ?? false);
      setVatRate(String(settings?.tax_vat_rate ?? 0));
    }

    setSettingsLoading(false);
  }

  async function saveRestaurantSettings() {
    if (!selectedRestaurant) return;

    setSettingsSaving(true);
    setSettingsError('');

    const { data, error } = await supabase.rpc('system_admin_update_restaurant_settings', {
      p_restaurant_id: selectedRestaurant.id,
      p_cash_on_delivery_enabled: cashOnDeliveryEnabled,
      p_automatic_rider_assignment_enabled: automaticRiderAssignmentEnabled,
      p_tax_vat_registered: vatRegistered,
      p_tax_prices_vat_inclusive: pricesVatInclusive,
      p_tax_vat_rate: Number(vatRate),
    });

    if (error) {
      setSettingsError(error.message);
    } else {
      const settings = Array.isArray(data) ? data[0] : data;
      setCashOnDeliveryEnabled(settings?.cash_on_delivery_enabled ?? cashOnDeliveryEnabled);
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

    const { data, error } = await supabase.rpc('system_admin_get_restaurant_staff', {
      p_restaurant_id: restaurantId,
    });

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

    const { error } = await supabase.rpc('system_admin_set_restaurant_staff_active', {
      p_staff_id: staffId,
      p_is_active: isActive,
    });

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

  async function resetRestaurantUserTotp(targetUserId: string, displayName: string, role: 'restaurant_owner' | 'staff', restaurantId: string, confirmed = false): Promise<boolean> {
    if (adminAccessLevel !== 'owner') {
      setStaffActionError('Only the System Administrator Owner can reset restaurant account authenticators.');
      setOwnerError('Only the System Administrator Owner can reset restaurant account authenticators.');
      return false;
    }
    if (!targetUserId || !restaurantId) {
      setStaffActionError('This account is not linked to a Supabase Auth user.');
      setOwnerError('This account is not linked to a Supabase Auth user.');
      return false;
    }
    if (!confirmed) {
      setTotpResetSuccess('');
      setPendingTotpReset({ userId: targetUserId, displayName, role, restaurantId });
      return false;
    }
    setStaffActionId(targetUserId);
    setStaffActionError('');
    setOwnerError('');
    try {
      const { data, error } = await supabase.functions.invoke('system-admin-reset-restaurant-user-totp', {
        body: { target_user_id: targetUserId, restaurant_id: restaurantId, target_role: role },
      });
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
      await recordAdminAudit('Restaurant account TOTP reset', restaurantId, role, targetUserId, { target_user_id: targetUserId, target_role: role, account_label: displayName, factor_type: 'totp' });
      setTotpResetSuccess('Authenticator reset for ' + displayName + '. They must sign in and enroll a new authenticator before accessing their workspace.');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reset this authenticator.';
      setStaffActionError(message);
      setOwnerError(message);
      return false;
    } finally {
      setStaffActionId(null);
    }
  }
  async function confirmDeleteRestaurantStaff() {
    if (!pendingDeleteStaff) return;

    const staffId = pendingDeleteStaff.id;
    setStaffActionId(staffId);
    setStaffActionError('');

    const { data, error } = await supabase.functions.invoke('system-admin-delete-staff', {
      body: { staffId },
    });

    if (error) {
      let message = error.message;

      try {
        const response = (error as { context?: Response }).context;
        if (response) {
          const responseBody = await response.clone().json() as { error?: unknown };
          if (typeof responseBody.error === 'string' && responseBody.error.trim()) {
            message = responseBody.error;
          }
        }
      } catch {
        // Keep the original FunctionsHttpError message if the response body cannot be parsed.
      }

      setStaffActionError(message);
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
    const { data, error } = await supabase.rpc('system_admin_set_restaurant_domain', {
      p_restaurant_id: selectedRestaurant.id,
      p_custom_domain: domain.trim(),
    });
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
    const restaurantName = inviteTenantRestaurantName.trim();
    const slug = inviteTenantSlug.trim().toLowerCase();
    const packageId = Number(inviteTenantPackageId);

    if (!email) {
      setInviteTenantError('Owner email is required.');
      setInviteTenantSaving(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke('system-admin-invite-tenant', {
      body: {
        email,
        name: restaurantName,
        slug,
        package_id: packageId,
      },
    });

    if (error) {
      let message = error.message;
      try {
        const response = (error as { context?: Response }).context;
        if (response) {
          const responseBody = await response.clone().json() as { error?: unknown };
          if (typeof responseBody.error === 'string' && responseBody.error.trim()) {
            message = responseBody.error;
          }
        }
      } catch {
        // Keep the original Functions error message.
      }
      setInviteTenantError(message);
      setInviteTenantSaving(false);
      return;
    }

    if (data?.error) {
      setInviteTenantError(String(data.error));
      setInviteTenantSaving(false);
      return;
    }

    setInviteTenantSuccess(
      `Restaurant "${restaurantName}" was created and package ${packageId} was assigned. The invitation email was sent to ${email}.`,
    );
    setInviteTenantEmail('');
    setInviteTenantRestaurantName('');
    setInviteTenantSlug('');
    setInviteTenantPackageId('1');
    setInviteTenantSaving(false);
  }

  async function loadRestaurantOwner(restaurantId: string) {
    setOwnerLoading(true);
    setOwnerError('');
    const { data, error } = await supabase.rpc('system_admin_get_restaurant_owner', { p_restaurant_id: restaurantId });
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
    const { data, error } = await supabase.rpc('system_admin_assign_restaurant_owner', {
      p_restaurant_id: selectedRestaurant.id,
      p_email: ownerEmail.trim(),
    });
    if (error) {
      const missingAuthAccount = /no auth account was found/i.test(error.message);
      if (!missingAuthAccount) {
        setOwnerError(error.message);
        setOwnerSaving(false);
        return;
      }

      const { data: invitationData, error: invitationError } = await supabase.functions.invoke('web2table-invite-user', {
        body: {
          email: ownerEmail.trim(),
          invitation_type: 'restaurant_owner',
          restaurant_id: selectedRestaurant.id,
        },
      });

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
    const { error } = await supabase.rpc('system_admin_remove_restaurant_owner', { p_restaurant_id: selectedRestaurant.id });
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

    const [summaryResult, monitoringResult, logsResult, healthResult] = await Promise.all([
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

    if (monitoringResult.error) {
      setDashboardError((current) => current || monitoringResult.error.message);
      setDashboardRestaurantMonitoring([]);
    } else {
      setDashboardRestaurantMonitoring((Array.isArray(monitoringResult.data) ? monitoringResult.data : []) as typeof dashboardRestaurantMonitoring);
      if (!Array.isArray(monitoringResult.data)) {
        setDashboardError((current) => current || 'Restaurant monitoring returned an unexpected response.');
      }
    }

    if (logsResult.error) {
      setDashboardError((current) => current || logsResult.error.message);
      setDashboardRecentLogs([]);
    } else {
      setDashboardRecentLogs((Array.isArray(logsResult.data) ? logsResult.data : []) as typeof auditLogs);
    }

    if (healthResult.error || !healthResult.data || healthResult.data.error) {
      setDashboardPlatformHealth(null);
    } else {
      setDashboardPlatformHealth(healthResult.data as typeof dashboardPlatformHealth);
    }

    setDashboardLoading(false);
  }

  async function loadAuditLogs(pageNumber = auditPageNumber) {
    setAuditLoading(true);
    setAuditError('');

    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (auditDatePreset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      startDate = start.toISOString();
      endDate = end.toISOString();
    } else if (auditDatePreset === '7_DAYS') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
      const end = new Date(now);
      end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      startDate = start.toISOString();
      endDate = end.toISOString();
    } else if (auditDatePreset === '30_DAYS') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 29);
      const end = new Date(now);
      end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      startDate = start.toISOString();
      endDate = end.toISOString();
    } else if (auditDatePreset === 'CUSTOM') {
      if (auditStartDate) startDate = new Date(auditStartDate + 'T00:00:00').toISOString();
      if (auditEndDate) {
        const end = new Date(auditEndDate + 'T00:00:00');
        end.setDate(end.getDate() + 1);
        endDate = end.toISOString();
      }
    }

    const pageSize = 50;
    const { data, error } = await supabase.rpc('system_admin_get_audit_logs', {
      p_restaurant_id: null,
      p_event_type: auditEventFilter === 'ALL' ? null : auditEventFilter,
      p_limit: pageSize,
      p_offset: pageNumber * pageSize,
      p_search: auditSearch.trim() || null,
      p_start_date: startDate,
      p_end_date: endDate,
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

  async function loadTotpResetAccounts() {
    setTotpResetLoading(true);
    setTotpResetError('');
    try {
      const { data, error } = await supabase.from('restaurants')
        .select('id,owner_id,name')
        .order('name', { ascending: true });
      if (error) throw error;
      const rows: Array<{userId:string;restaurantId:string;restaurantName:string;displayName:string;email:string;role:'restaurant_owner'|'staff';staffRole?:string}> = [];
      const tenantRows = data ?? [];
      for (const restaurant of tenantRows) {
        if (restaurant.owner_id) rows.push({
          userId: restaurant.owner_id, restaurantId: restaurant.id, restaurantName: restaurant.name || 'Restaurant',
          displayName: 'Restaurant owner', email: '', role: 'restaurant_owner',
        });
        const { data: staffData, error: staffError } = await supabase.rpc('system_admin_get_restaurant_staff', { p_restaurant_id: restaurant.id });
        if (staffError) throw new Error('Could not load staff for ' + (restaurant.name || 'restaurant') + ': ' + staffError.message);
        for (const staff of (Array.isArray(staffData) ? staffData : [])) {
          if (staff.auth_user_id) rows.push({
            userId: staff.auth_user_id, restaurantId: restaurant.id, restaurantName: restaurant.name || 'Restaurant',
            displayName: staff.name || staff.email || 'Staff member', email: staff.email || '',
            role: 'staff', staffRole: staff.role || 'Staff',
          });
        }
      }

      // Retrieve owner login emails server-side; the browser must not access Auth admin APIs.
      const ownerIds = [...new Set(rows.filter((account) => account.role === 'restaurant_owner').map((account) => account.userId))];
      if (ownerIds.length > 0) {
        const { data: ownerEmailData, error: ownerEmailError } = await supabase.functions.invoke('system-admin-get-owner-emails', {
          body: { user_ids: ownerIds },
        });
        if (!ownerEmailError && ownerEmailData?.emails && typeof ownerEmailData.emails === 'object') {
          for (const row of rows) {
            if (row.role === 'restaurant_owner') {
              row.email = ownerEmailData.emails[row.userId] || '';
              const ownerName = ownerEmailData.names?.[row.userId];
              if (typeof ownerName === 'string' && ownerName.trim()) row.displayName = ownerName.trim();
            }
          }
        } else if (ownerEmailError) {
          console.warn('Could not load restaurant owner login emails:', ownerEmailError.message);
        }
      }
      setTotpResetAccounts(rows);
    } catch (error) {
      setTotpResetError(error instanceof Error ? error.message : 'Unable to load restaurant accounts.');
      setTotpResetAccounts([]);
    } finally {
      setTotpResetLoading(false);
    }
  }

  function openTotpReset(pushHistory = true) {
    if (adminAccessLevel !== 'owner') return;
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

    const { data, error } = await supabase
      .from('restaurants')
      .select('id,owner_id,custom_domain,slug,name,tagline,logo_url,location_text,contact_number,email,is_active,created_at,updated_at')
      .order('created_at', { ascending: false });

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

    const channel = supabase
      .channel('system-admin-audit-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_admin_audit_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLog = payload.new as typeof auditLogs[number];
            setAuditLogs((current) => {
              if (current.some((log) => log.id === newLog.id)) return current;
              return [newLog, ...current];
            });
          }

          if (payload.eventType === 'UPDATE') {
            const updatedLog = payload.new as typeof auditLogs[number];
            setAuditLogs((current) =>
              current
                .map((log) => log.id === updatedLog.id ? updatedLog : log)
                .sort((a, b) => b.created_at.localeCompare(a.created_at)),
            );
          }

          if (payload.eventType === 'DELETE') {
            const deletedLog = payload.old as typeof auditLogs[number];
            setAuditLogs((current) => current.filter((log) => log.id !== deletedLog.id));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authorized, adminPage]);

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
    const headers = ['Date & Time', 'Administrator', 'Restaurant', 'Event', 'Action', 'Entity', 'Details'];
    const escapeCsv = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
    const rows = filteredAuditLogs.map((log) => [
      new Date(log.created_at).toLocaleString(), log.admin_name || log.admin_email || 'Unknown administrator',
      log.restaurant_name || '', log.event_type, log.action, log.entity_type || '', JSON.stringify(log.details ?? {}),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `web2table-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  const filteredRestaurants = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return restaurants;

    return restaurants.filter((restaurant) =>
      [restaurant.name, restaurant.slug, restaurant.location_text ?? '', restaurant.email ?? '']
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
          <img className="company-logo auth-logo" src="https://xaihajwrsvcdjisezmmc.supabase.co/storage/v1/object/public/web2table-assets/web2table%20(1).png" alt="WEB2TABLE" />
          <div className="eyebrow">WEB2TABLE Platform</div>
          <h1>Set up your account</h1>
          <p>You have been invited as a System Administrator. Create your password to activate your account.</p>
          <form onSubmit={completeSystemAdminInvitation}>
            <label>
              Password
              <input
                type="password"
                value={invitePassword}
                onChange={(event) => setInvitePassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                value={invitePasswordConfirm}
                onChange={(event) => setInvitePasswordConfirm(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            {inviteSetupError && <div className="error-banner">{inviteSetupError}</div>}
            <button type="submit" disabled={inviteSettingPassword}>
              {inviteSettingPassword ? 'Activating account...' : 'Create password & continue'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <img className="company-logo auth-logo" src="https://xaihajwrsvcdjisezmmc.supabase.co/storage/v1/object/public/web2table-assets/web2table%20(1).png" alt="WEB2TABLE" />
          <div className="eyebrow">WEB2TABLE Platform</div>
          <h1>System Admin</h1>
          <p>Sign in to manage restaurants and platform settings.</p>
          <form onSubmit={signIn}>
            <label>
              Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </label>
            <label>
              Password
              <span className="password-input-wrap"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /><button className="password-visibility-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="M4 4 20 20" />}</svg></button></span>
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
          <header className="workspace-topbar"><div><span className="topbar-kicker">ACCOUNT SECURITY</span><strong>TOTP Reset</strong></div><div className="topbar-right"><span className="topbar-status">System Admin Owner</span></div></header>
          <TotpResetPanel
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
            <div className="topbar-right"><span className="topbar-status"><span className="sidebar-online-dot" />Administration</span></div>
          </header>
          {accountMenuOpen && (
            <div className="account-menu">
              <div className="account-menu-header"><span>System Administrator</span><strong>{adminAccessLevel === 'owner' ? 'Owner' : adminAccessLevel === 'administrator' ? 'Administrator — Full Access' : 'View Only'}</strong></div>
              {adminAccessLevel === 'owner' && <button className="account-menu-item" onClick={() => openAdministrators()}>System Administrators</button>}
              <button type="button" className="account-menu-item" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void signOut(); }}>Sign out</button>
            </div>
          )}
          <main className="admin-workspace">
        <DashboardOverview
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
        <div className="topbar-right"><span className="topbar-status"><span className="sidebar-online-dot" />Administration</span></div>
      </header>
      <main className="admin-shell admin-shell-with-sidebar">
       {accountMenuOpen && (
          <div className="account-menu">
            <div className="account-menu-header"><span>System Administrator</span><strong>{adminAccessLevel === 'owner' ? 'Owner' : adminAccessLevel === 'administrator' ? 'Administrator — Full Access' : 'View Only'}</strong></div>
            <button className="account-menu-item" onClick={() => setAccountMenuOpen(false)}>System Administrators</button>
            <button className="account-menu-item" onClick={signOut}>Sign out</button>
          </div>
        )}
        <AdministratorsPanel
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

        <AuditLogsPanel
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

  function startCreate() {
    setEditingRestaurant(null);
    setForm(emptyForm);
    setRestaurantError('');
    setShowForm(true);
  }

  function startEdit(restaurant: Restaurant) {
    setEditingRestaurant(restaurant);
    setForm({
      name: restaurant.name,
      slug: restaurant.slug,
      tagline: restaurant.tagline,
      logo_url: restaurant.logo_url ?? '',
      location_text: restaurant.location_text ?? '',
      contact_number: restaurant.contact_number ?? '',
      email: restaurant.email ?? '',
      is_active: restaurant.is_active,
    });
    setRestaurantError('');
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingRestaurant(null);
    setForm(emptyForm);
  }

  function updateForm(field: keyof RestaurantForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveRestaurant(event: FormEvent) {
    event.preventDefault();
    setPendingRestaurantFormSave(true);
  }

  async function confirmSaveRestaurant() {
    setPendingRestaurantFormSave(false);
    setSaving(true);
    setRestaurantError('');

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      tagline: form.tagline.trim(),
      logo_url: form.logo_url.trim() || null,
      location_text: form.location_text.trim() || null,
      contact_number: form.contact_number.trim() || null,
      email: form.email.trim() || null,
      is_active: form.is_active,
    };

    const result = editingRestaurant
      ? await supabase.from('restaurants').update(payload).eq('id', editingRestaurant.id)
      : await supabase.from('restaurants').insert(payload).select('id').single();

    if (result.error) {
      setRestaurantError(result.error.message);
      setSaving(false);
      return;
    }

    const restaurantId = editingRestaurant?.id ?? (result.data as { id: string } | null)?.id ?? null;

    const restaurantChanges = editingRestaurant
      ? Object.fromEntries(
          Object.entries({
            name: [editingRestaurant.name, payload.name],
            slug: [editingRestaurant.slug, payload.slug],
            tagline: [editingRestaurant.tagline, payload.tagline],
            logo_url: [editingRestaurant.logo_url, payload.logo_url],
            location_text: [editingRestaurant.location_text, payload.location_text],
            contact_number: [editingRestaurant.contact_number, payload.contact_number],
            email: [editingRestaurant.email, payload.email],
            is_active: [editingRestaurant.is_active, payload.is_active],
          }).filter(([, [oldValue, newValue]]) => oldValue !== newValue),
        )
      : {};

    await recordAdminAudit(
      editingRestaurant ? 'Restaurant profile updated' : 'Restaurant created',
      restaurantId,
      'restaurant',
      restaurantId,
      editingRestaurant
        ? {
            changes: restaurantChanges,
          }
        : {
            created_values: {
              name: payload.name,
              slug: payload.slug,
              tagline: payload.tagline,
              logo_url: payload.logo_url,
              location_text: payload.location_text,
              contact_number: payload.contact_number,
              email: payload.email,
              is_active: payload.is_active,
            },
          },
    );

    setSaving(false);
    closeForm();
    await loadRestaurants();
  }

  async function toggleRestaurant(restaurant: Restaurant) {
    const nextStatus = !restaurant.is_active;
    setRestaurantError('');

    const { error } = await supabase
      .from('restaurants')
      .update({ is_active: nextStatus })
      .eq('id', restaurant.id);

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
      const { data, error } = await supabase.functions.invoke('system-admin-delete-restaurant', {
        body: {
          restaurant_id: restaurant.id,
        },
      });

      if (error) {
        let message = error.message;

        try {
          const response = (error as { context?: Response }).context;
          if (response) {
            const responseBody = await response.clone().json() as { error?: unknown };
            if (typeof responseBody.error === 'string' && responseBody.error.trim()) {
              message = responseBody.error;
            }
          }
        } catch {
          // Keep the original FunctionsHttpError message when the response body cannot be parsed.
        }

        setRestaurantError(message);
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

        <section className="dashboard-card restaurant-manage-card">
          <RestaurantManagementHeader
            restaurant={selectedRestaurant}
            manageTab={manageTab}
            onSelectTab={setManageTab}
            onClose={() => openRestaurants()}
            onLoadOwner={() => void loadRestaurantOwner(selectedRestaurant.id)}
            onSelectDomain={() => { setDomain(selectedRestaurant.custom_domain ?? ''); setDomainError(''); }}
            onLoadSettings={() => void loadRestaurantSettings(selectedRestaurant.id)}
            onLoadStaff={() => void loadRestaurantStaff(selectedRestaurant.id)}
            onLoadPackage={() => void loadRestaurantPackage(selectedRestaurant.id)}
          />

          {manageTab === 'overview' ? (
            <RestaurantOverview
              restaurant={selectedRestaurant}
              canManage={canManage}
              onRequestStatusChange={() => setPendingRestaurantStatus(selectedRestaurant)}
            />
          ) : manageTab === 'owner' ? (
            <RestaurantOwnerPanel
              loading={ownerLoading}
              ownerUserId={ownerUserId}
              ownerName={ownerName}
              ownerEmail={ownerEmail}
              canManage={canManage}
              ownerSaving={ownerSaving}
              error={ownerError}
              onEmailChange={setOwnerEmail}
              onRequestAssign={() => { setOwnerError(''); setPendingAssignOwner(true); }}
              onRequestRemove={() => { setOwnerError(''); setPendingRemoveOwner(true); }}
            />
          ) : manageTab === 'domain' ? (
            <RestaurantDomainPanel
              domain={domain}
              onDomainChange={setDomain}
              canManage={canManage}
              domainSaving={domainSaving}
              domainError={domainError}
              onRequestSave={() => { setDomainError(''); setPendingSaveDomain(true); }}
            />
          ) : manageTab === 'package' ? (
            <RestaurantPackagePanel
              canManage={canManage}
              packageLoading={packageLoading}
              packageSaving={packageSaving}
              packageError={packageError}
              restaurantPackageId={restaurantPackageId}
              restaurantPackageRows={restaurantPackageRows}
              onAssignPackage={(packageId) => void assignRestaurantPackage(packageId)}
              onSetModuleEnabled={(moduleKey, enabled) => void setRestaurantModuleEnabled(moduleKey, enabled)}
            />
          ) : manageTab === 'staff' ? (
            <RestaurantStaffPanel
              canManage={canManage}
              staffLoading={staffLoading}
              staffError={staffError}
              restaurantStaff={restaurantStaff}
              staffActionError={staffActionError}
              staffActionId={staffActionId}
              onSetStaffActive={(staffId, isActive) => void setRestaurantStaffActive(staffId, isActive)}
              onRequestDelete={requestDeleteRestaurantStaff}
            />
          ) : (
            <RestaurantSettingsPanel
              canManage={canManage}
              settingsLoading={settingsLoading}
              vatRegistered={vatRegistered}
              onVatRegisteredChange={setVatRegistered}
              vatRate={vatRate}
              onVatRateChange={setVatRate}
              pricesVatInclusive={pricesVatInclusive}
              onPricesVatInclusiveChange={setPricesVatInclusive}
              cashOnDeliveryEnabled={cashOnDeliveryEnabled}
              onCashOnDeliveryChange={setCashOnDeliveryEnabled}
              automaticRiderAssignmentEnabled={automaticRiderAssignmentEnabled}
              onAutomaticRiderAssignmentChange={setAutomaticRiderAssignmentEnabled}
              settingsError={settingsError}
              settingsSaving={settingsSaving}
              onRequestSave={() => setPendingSaveSettings(true)}
            />
          )}
        </section>
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
                      const { data } = await supabase.from('restaurants').select('id,owner_id,custom_domain,slug,name,tagline,logo_url,location_text,contact_number,email,is_active,created_at,updated_at').eq('id', restaurant.id).single();
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
    <div className="admin-layout">
      <SystemAdminSidebar activePage={adminPage} accessLevel={adminAccessLevel} onDashboard={() => openDashboard()} onRestaurants={() => openRestaurants()} onAdministrators={() => openAdministrators()} onAuditLogs={() => openAuditLogs()} onPlatformHealth={() => openPlatformHealth()} onMapboxUsage={() => openMapboxUsage()} onTotpResets={() => openTotpReset()} onSignOut={() => void signOut()} />
      <div className="admin-main">
        <header className="workspace-topbar">
          <div><span className="topbar-kicker">WEB2TABLE PLATFORM</span><strong>{isAdminPage(adminPage, 'restaurants') ? 'Restaurant management' : isAdminPage(adminPage, 'administrators') ? 'System administrators' : 'Activity logs'}</strong></div>
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

      <section className="dashboard-card">
        <div className="stats-row">
          <div className="stat-card">
            <span>Total restaurants</span>
            <strong>{restaurants.length}</strong>
          </div>
          <div className="stat-card">
            <span>Active</span>
            <strong>{restaurants.filter((restaurant) => restaurant.is_active).length}</strong>
          </div>
          <div className="stat-card">
            <span>Inactive</span>
            <strong>{restaurants.filter((restaurant) => !restaurant.is_active).length}</strong>
          </div>
        </div>

        <div className="toolbar restaurants-search-toolbar">
          <input
            className="search-input uniform-search-input"
            type="search"
            placeholder="Search restaurants..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="live-indicator"><span className="live-dot" /> Live</span>
          {adminAccessLevel === 'owner' && (
            <button className="restaurants-invite-button" onClick={() => {
              setInviteTenantError('');
              setInviteTenantSuccess('');
              setInviteTenantEmail('');
              setShowInviteTenant(true);
            }}>
              Invite tenant
            </button>
          )}
        </div>

        {restaurantError && <div className="error-banner">{restaurantError}</div>}

        {restaurantLoading ? (
          <div className="empty-state">Loading restaurants...</div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="empty-state">
            <strong>{restaurants.length === 0 ? 'No restaurants yet' : 'No matching restaurants'}</strong>
            <span>{restaurants.length === 0 ? 'Add the first restaurant to start building the platform.' : 'Try a different search term.'}</span>
          </div>
        ) : (
          <div className="restaurant-list">
            {filteredRestaurants.map((restaurant) => (
              <article className="restaurant-row" key={restaurant.id}>
                <div className="restaurant-main">
                  <div className="restaurant-logo">
                    {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" /> : <span>{restaurant.name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div>
                    <div className="restaurant-title-line">
                      <h3>{restaurant.name}</h3>
                      <span className={restaurant.is_active ? 'status active' : 'status inactive'}>
                        {restaurant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="restaurant-slug">/{restaurant.slug}</div>
                    {restaurant.tagline && <p>{restaurant.tagline}</p>}
                    <div className="restaurant-meta">
                      {restaurant.location_text && <span>{restaurant.location_text}</span>}
                      {restaurant.email && <span>{restaurant.email}</span>}
                      {restaurant.contact_number && <span>{restaurant.contact_number}</span>}
                    </div>
                  </div>
                </div>

                <div className="row-actions">
                  <button className="secondary-button" onClick={() => openRestaurant(restaurant)}>Manage</button>
                  {canManage && <button className="secondary-button" onClick={() => startEdit(restaurant)}>Edit</button>}

                  {canManage && <button type="button" className="danger-button" onClick={(event) => {
                     event.preventDefault();
                     event.stopPropagation();
                     requestDeleteRestaurant(restaurant);
                   }}>
                     Delete
                   </button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {renderRestaurantDeleteModal()}

      {showInviteTenant && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="tenant-invite-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">Tenant onboarding</div>
                <h2 id="tenant-invite-title">Invite a tenant</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setShowInviteTenant(false)}
                disabled={inviteTenantSaving}
                aria-label="Close"
              >×</button>
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
                    onChange={(event) => setInviteTenantRestaurantName(event.target.value)}
                    placeholder="Required for a new tenant"
                    disabled={inviteTenantSaving}
                  />
                </label>

                <label>
                  Restaurant slug
                  <input
                    value={inviteTenantSlug}
                    onChange={(event) => setInviteTenantSlug(event.target.value.toLowerCase())}
                    placeholder="my-restaurant"
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    title="Use lowercase letters, numbers, and single hyphens."
                    disabled={inviteTenantSaving}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Package
                  <select
                    value={inviteTenantPackageId}
                    onChange={(event) => setInviteTenantPackageId(event.target.value)}
                    disabled={inviteTenantSaving}
                  >
                    <option value="1">1 — Full System</option>
                    <option value="2">2 — Self Ordering + POS</option>
                    <option value="3">3 — POS</option>
                    <option value="4">4 — Self Ordering + POS + Kitchen</option>
                    <option value="5">5 — Dispatch + Delivery</option>
                    <option value="6">6 — Self Ordering + Kitchen</option>
                    <option value="7">7 — POS + Delivery</option>
                  </select>
                </label>

                <label>
                  Owner email
                  <input
                    type="email"
                    value={inviteTenantEmail}
                    onChange={(event) => setInviteTenantEmail(event.target.value)}
                    placeholder="owner@example.com"
                    required
                    disabled={inviteTenantSaving}
                  />
                </label>
              </div>

              {inviteTenantError && <div className="error-banner">{inviteTenantError}</div>}
              {inviteTenantSuccess && <div className="success-banner">{inviteTenantSuccess}</div>}
              <div className="modal-actions">
                <button type="submit" disabled={inviteTenantSaving}>
                  {inviteTenantSaving ? 'Sending invitation...' : 'Invite tenant'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showForm && (
        <RestaurantFormPanel
          form={form}
          updateForm={updateForm}
          editingRestaurant={Boolean(editingRestaurant)}
          saving={saving}
          restaurantError={restaurantError}
          onClose={closeForm}
          onSubmit={saveRestaurant}
        />
      )}

      {pendingRestaurantFormSave && (
        <div className="modal-backdrop restaurant-form-confirm-backdrop" role="presentation">
          <section className="modal-card restaurant-form-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="restaurant-save-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">{editingRestaurant ? 'Save Changes' : 'Create Restaurant'}</div>
                <h2 id="restaurant-save-title">{editingRestaurant ? 'Save these changes?' : 'Create this restaurant?'}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setPendingRestaurantFormSave(false)} disabled={saving} aria-label="Close">×</button>
            </div>
            <div className="restaurant-form-confirm-content">
              <p>You are about to {editingRestaurant ? 'update' : 'create'} <strong>{form.name.trim() || 'this restaurant'}</strong>.</p>
              <div className="restaurant-form-confirm-warning">
                <strong>{editingRestaurant ? 'These changes will update the restaurant profile.' : 'This will create a new restaurant on the platform.'}</strong>
                <span>{form.is_active ? 'The restaurant will be active after saving.' : 'The restaurant will be created as inactive.'}</span>
              </div>
              {restaurantError && <div className="error-banner">{restaurantError}</div>}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setPendingRestaurantFormSave(false)} disabled={saving}>Cancel</button>
              <button type="button" onClick={() => void confirmSaveRestaurant()} disabled={saving}>
                {saving ? 'Saving...' : editingRestaurant ? 'Confirm & Save' : 'Confirm & Create'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SystemAdminMfaGate>
      <AppContent />
    </SystemAdminMfaGate>
  );
}
