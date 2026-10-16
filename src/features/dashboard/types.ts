export type DashboardSummary = {
  total_restaurants: number;
  active_restaurants: number;
  inactive_restaurants: number;
  active_system_administrators: number;
  pending_system_administrators: number;
};

export type DashboardRestaurantMonitoring = {
  restaurant_id: string;
  restaurant_name: string;
  is_active: boolean;
  customer_accounts: number;
  customers_ordered_today: number;
  orders_today: number;
  processing_orders: number;
  last_activity: string | null;
  logged_in_now: number | null;
};

export type DashboardPlatformHealth = {
  overallStatus: 'healthy' | 'degraded' | 'critical' | 'unknown';
  generatedAt: string;
  services: Array<{
    key: string;
    name: string;
    status: 'healthy' | 'degraded' | 'critical' | 'unknown';
    latencyMs: number | null;
    message: string;
  }>;
  incidents: Array<{
    severity: 'info' | 'warning' | 'critical';
    service: string;
    title: string;
    summary: string;
    recommendation?: string;
  }>;
  configurationWarnings: string[];
};
