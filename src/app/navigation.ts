export type AdminPage = 'dashboard' | 'restaurants' | 'audit' | 'administrators' | 'health' | 'maps' | 'totp-reset';

export type NavigationPage = AdminPage | 'restaurant';

export type NavigationState = {
  page: NavigationPage;
  restaurantId: string | null;
  auditId: string | null;
};

/** Parse the current query string into the admin page and optional detail identifiers. */
export function getNavigationFromSearch(search: string): NavigationState {
  const params = new URLSearchParams(search);
  const page = params.get('page');
  const restaurantId = params.get('restaurantId');
  const auditId = params.get('auditId');

  if (page === 'restaurant' && restaurantId) {
    return { page: 'restaurant', restaurantId, auditId: null };
  }

  if (page === 'restaurants') return { page: 'restaurants', restaurantId: null, auditId: null };
  if (page === 'audit') return { page: 'audit', restaurantId: null, auditId };
  if (page === 'administrators') return { page: 'administrators', restaurantId: null, auditId: null };
  if (page === 'health') return { page: 'health', restaurantId: null, auditId: null };
  if (page === 'maps') return { page: 'maps', restaurantId: null, auditId: null };
  if (page === 'totp-reset') return { page: 'totp-reset', restaurantId: null, auditId: null };
  return { page: 'dashboard', restaurantId: null, auditId: null };
}

/** Build the query string used when navigating between admin pages. */
export function buildNavigationSearch(
  page: NavigationPage,
  options: { restaurantId?: string; auditId?: string } = {},
): string {
  const params = new URLSearchParams();
  params.set('page', page);
  if (options.restaurantId) params.set('restaurantId', options.restaurantId);
  if (options.auditId) params.set('auditId', options.auditId);
  return `?${params.toString()}`;
}
