import { supabase } from '../../../lib/supabase';
import type { DashboardSummary, DashboardRestaurantMonitoring, DashboardPlatformHealth } from '../types';

type Snapshot = { summary: DashboardSummary; monitoring: DashboardRestaurantMonitoring[] };

/**
 * Web2Table's single MFA-protected snapshot replaces old system_admin_*
 * dashboard functions. No dashboard layout/components are changed.
 *
 * Order/customer metrics are zero until real ordering exists. Historical
 * audit events and live dependency health are NOT available in this adapter.
 */
export async function fetchDashboardData() {
  const { data, error } = await supabase.rpc('web2table_admin_dashboard_snapshot');
  const raw = data as Partial<Snapshot> | null;

  if (error || !raw || typeof raw.summary !== 'object' || !Array.isArray(raw.monitoring)) {
    const problem = { message: error?.message ?? 'Web2Table dashboard returned an invalid response.' };
    return [
      { data: null, error: problem },
      { data: [], error: problem },
      { data: [], error: null },
      { data: null, error: null },
    ] as const;
  }

  // The server checks both active platform admin membership and AAL2.
  // Warn plainly when separate platform health telemetry is not configured.
  const health: DashboardPlatformHealth = {
    overallStatus: 'degraded',
    generatedAt: new Date().toISOString(),
    services: [],
    incidents: [{
      severity: 'warning',
      service: 'platform-health',
      title: 'Live health monitoring not connected',
      summary: 'Dependency monitoring is not connected to the current Web2Table database. This is not a verified healthy status.',
    }],
    configurationWarnings: ['Live dependency health monitoring is not yet connected.'],
  };

  return [
    { data: raw.summary, error: null },
    { data: raw.monitoring, error: null },
    { data: [], error: null },
    { data: health, error: null },
  ] as const;
}
