export type TotpResetAccount = {
  userId: string;
  restaurantId: string;
  restaurantName: string;
  displayName: string;
  email: string;
  role: 'restaurant_owner' | 'staff';
  staffRole?: string;
};

export type PendingTotpReset = {
  userId: string;
  displayName: string;
  role: 'restaurant_owner' | 'staff';
  restaurantId: string;
};
