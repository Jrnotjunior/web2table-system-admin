import { supabase } from '../../../lib/supabase';
import type { TotpResetAccount } from '../types';

export async function fetchTotpResetAccounts(): Promise<TotpResetAccount[]> {
  const { data, error } = await supabase.from('restaurants')
    .select('id,owner_id,name')
    .order('name', { ascending: true });
  if (error) throw error;

  const rows: TotpResetAccount[] = [];
  for (const restaurant of data ?? []) {
    if (restaurant.owner_id) rows.push({
      userId: restaurant.owner_id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name || 'Restaurant',
      displayName: 'Restaurant owner',
      email: '',
      role: 'restaurant_owner',
    });

    const { data: staffData, error: staffError } = await supabase.rpc(
      'system_admin_get_restaurant_staff',
      { p_restaurant_id: restaurant.id },
    );
    if (staffError) {
      throw new Error('Could not load staff for ' + (restaurant.name || 'restaurant') + ': ' + staffError.message);
    }
    for (const staff of Array.isArray(staffData) ? staffData : []) {
      if (staff.auth_user_id) rows.push({
        userId: staff.auth_user_id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name || 'Restaurant',
        displayName: staff.name || staff.email || 'Staff member',
        email: staff.email || '',
        role: 'staff',
        staffRole: staff.role || 'Staff',
      });
    }
  }

  // Owner login emails must be retrieved server-side, never through browser Auth admin APIs.
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

  return rows;
}
