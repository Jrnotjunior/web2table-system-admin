import { createClient } from '@supabase/supabase-js';

// An invitation may return to the app in either Supabase's token-hash format,
// its implicit-flow token fragment, or a PKCE ?code= callback. The PKCE
// callback may not preserve ?type=invite, so recognize the one-time code too.
// This flag only selects the password-setup screen; the Edge Function still
// validates the authenticated email-link claims and active admin authorization.
// Do not persist this in sessionStorage: stale state must never trap returning
// admins on Create password at the ordinary sign-in URL.
const query = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
const fragment = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.hash.slice(1));
const callbackType = query.get('type') ?? fragment.get('type');
const hasInviteToken = query.has('token_hash') ||
  (fragment.has('access_token') && fragment.has('refresh_token'));
const hasPkceCallback = query.has('code');
const invitationSetupStorageKey = 'web2table-system-admin-invitation-setup';

function hasStoredInvitationSetup(): boolean {
  try {
    return typeof window !== 'undefined' &&
      window.sessionStorage.getItem(invitationSetupStorageKey) === 'pending';
  } catch {
    return false;
  }
}

let invitationSetupActive = (callbackType === 'invite' && hasInviteToken) ||
  // Supabase PKCE exchanges a one-time code for the session. The server-side
  // password activation endpoint is the authorization boundary for this path.
  hasPkceCallback ||
  hasStoredInvitationSetup();

/** Mark setup as pending only after the invitation callback has yielded a verified session. */
export function markPasswordSetupPending(): void {
  invitationSetupActive = true;
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(invitationSetupStorageKey, 'pending');
    }
  } catch {
    // The current page can still complete setup if storage is unavailable.
  }
}

export function isPasswordSetupPending(): boolean {
  return invitationSetupActive;
}

export function clearPasswordSetupPending(): void {
  invitationSetupActive = false;
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(invitationSetupStorageKey);
    }
  } catch {
    // Clearing in-memory state is still required when storage is unavailable.
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep System Admin authentication isolated from the restaurant platform
    // when both applications are open in the same browser.
    storageKey: 'web2table-system-admin-auth',
  },
});
