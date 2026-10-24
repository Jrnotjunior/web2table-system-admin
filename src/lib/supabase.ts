import { createClient } from '@supabase/supabase-js';

// Capture a one-use invitation's destination before the auth client parses the URL.
// This state chooses an existing setup screen; it never grants privileges.
const setupKey = 'web2table-pending-password-setup';
if (typeof window !== 'undefined') {
  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const linkType = query.get('type') ?? fragment.get('type');
  // A magic link generated specifically for completing an invited account
  // may return without a type field in the fragment. Its exact callback path
  // is still necessary. The marker is never an authentication credential.
  const tokenBearing = query.has('token_hash') ||
    (fragment.has('access_token') && fragment.has('refresh_token'));
  const invitationCallback = linkType === 'invite';
  if (tokenBearing && invitationCallback) {
    window.sessionStorage.setItem(setupKey, '1');
  }
}
export function isPasswordSetupPending(): boolean {
  return typeof window !== 'undefined' && window.sessionStorage.getItem(setupKey) === '1';
}
export function clearPasswordSetupPending(): void {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(setupKey);
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
