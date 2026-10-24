import { createClient } from '@supabase/supabase-js';

// Invite mode is only valid on the document load that RECEIVES the token.
// Do not persist this in sessionStorage: a stale flag was trapping returning
// admins on Create password even at the ordinary sign-in URL.
const query = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
const fragment = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.hash.slice(1));
const invitationCallback = (query.get('type') ?? fragment.get('type')) === 'invite';
let invitationSetupActive = invitationCallback &&
  (query.has('token_hash') ||
   (fragment.has('access_token') && fragment.has('refresh_token')));

export function isPasswordSetupPending(): boolean {
  return invitationSetupActive;
}
export function clearPasswordSetupPending(): void {
  invitationSetupActive = false;
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
