export type TotpResetAccount = {
  userId: string;
  restaurantId: string;
  restaurantName: string;
  displayName: string;
  email: string;
  role: 'restaurant_owner' | 'staff' | 'system_admin';
  staffRole?: string;
  accessLevel?: string;
};

export type PendingTotpReset = {
  userId: string;
  displayName: string;
  role: 'restaurant_owner' | 'staff' | 'system_admin';
  restaurantId: string;
  accessLevel?: string;
};
