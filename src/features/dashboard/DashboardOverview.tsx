type DashboardSummary = {
  total_restaurants: number;
  active_restaurants: number;
  inactive_restaurants: number;
  active_system_administrators: number;
  pending_system_administrators: number;
};

type RestaurantMonitoring = {
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

type DashboardLog = {
  id: string;
  action: string;
  admin_name: string | null;
  admin_email: string | null;
  restaurant_name: string | null;
  created_at: string;
};

type PlatformHealth = {
  overallStatus: 'healthy' | 'degraded' | 'critical' | 'unknown';
  generatedAt: string;
  services: Array<{ key: string; name: string; status: 'healthy' | 'degraded' | 'critical' | 'unknown'; latencyMs: number | null; message: string }>;
  incidents: Array<{ severity: 'info' | 'warning' | 'critical'; service: string; title: string; summary: string; recommendation?: string }>;
  configurationWarnings: string[];
};

type Props = {
  error: string;
  loading: boolean;
  summary: DashboardSummary | null;
  platformHealth: PlatformHealth | null;
  restaurantMonitoring: RestaurantMonitoring[];
  recentLogs: DashboardLog[];
  canManageAdministrators: boolean;
  onOpenPlatformHealth: () => void;
  onOpenRestaurants: () => void;
  onOpenAdministrators: () => void;
  onOpenAuditLogs: () => void;
  onOpenAuditLog: (log: DashboardLog) => void;
};

export default function DashboardOverview({
  error, loading, summary, platformHealth, restaurantMonitoring, recentLogs,
  canManageAdministrators, onOpenPlatformHealth, onOpenRestaurants,
  onOpenAdministrators, onOpenAuditLogs, onOpenAuditLog,
}: Props) {
  return (
          <section className="dashboard-card system-dashboard-card">
            {error && <div className="error-banner">{error}</div>}
            {loading && !summary ? <div className="empty-state">Loading platform command center...</div> : (
              <>
                <div className={`dashboard-platform-status dashboard-platform-status-${platformHealth?.overallStatus ?? 'unknown'}`}>
                  <div>
                    <div className="eyebrow">Platform Status</div>
                    <div className="dashboard-platform-status-title"><span className="dashboard-status-dot" />
                      {platformHealth?.overallStatus === 'critical' ? 'Critical' : platformHealth?.overallStatus === 'degraded' ? 'Degraded' : platformHealth?.overallStatus === 'healthy' ? 'Operational' : 'Health data unavailable'}
                    </div>
                    <p>{platformHealth?.generatedAt ? `Last checked ${new Date(platformHealth.generatedAt).toLocaleString()}` : 'Run Platform Health to refresh dependency status.'}</p>
                  </div>
                  <div className="dashboard-platform-services">
                    {(platformHealth?.services ?? []).map((service) => <div className="dashboard-service-chip" key={service.key}><span className={`dashboard-status-dot dashboard-status-dot-${service.status}`} /><strong>{service.name.replace('Web App — ', '')}</strong><span>{service.status}</span></div>)}
                  </div>
                </div>
                <div className="dashboard-section-label">Attention Required</div>
                <div className="dashboard-command-grid">
                  <div className="dashboard-attention-panel">
                    {platformHealth?.configurationWarnings?.filter((warning) => !warning.toLowerCase().includes('openai')).length ? platformHealth.configurationWarnings.filter((warning) => !warning.toLowerCase().includes('openai')).slice(0, 4).map((warning) => (
                      <div className="dashboard-attention-row" key={warning}><span className="dashboard-attention-icon">!</span><div><strong>Configuration</strong><span>{warning}</span></div></div>
                    )) : platformHealth?.incidents?.length ? platformHealth.incidents.slice(0, 4).map((incident, index) => (
                      <div className="dashboard-attention-row" key={`${incident.service}-${index}`}><span className={`dashboard-attention-icon dashboard-attention-${incident.severity}`}>{incident.severity === 'critical' ? '!' : '•'}</span><div><strong>{incident.title}</strong><span>{incident.summary}</span></div></div>
                    )) : <div className="dashboard-attention-empty"><span>✓</span><div><strong>No active issues</strong><span>Monitored dependencies are operating normally.</span></div></div>}
                  </div>
                  <div className="dashboard-ai-panel"><div className="eyebrow">Operations Analysis</div><h3>{platformHealth?.overallStatus === 'critical' ? 'Immediate attention recommended' : platformHealth?.overallStatus === 'degraded' ? 'Platform operational with warnings' : 'Platform operating normally'}</h3><p>{platformHealth?.incidents?.[0]?.summary ?? 'Health monitoring will surface dependency problems and operational warnings here.'}</p><button className="secondary-button" type="button" onClick={() => onOpenPlatformHealth()}>View diagnosis</button></div>
                </div>
                <div className="dashboard-section-label">Live Operations</div>
                <div className="system-stats-grid dashboard-kpi-grid">
                  <button className="stat-card dashboard-stat-button dashboard-kpi-card" type="button" onClick={() => onOpenRestaurants()}><span>Restaurants</span><strong>{summary?.active_restaurants ?? 0}<small> active</small></strong><em>{summary?.total_restaurants ?? 0} total</em></button>
                  <div className="stat-card dashboard-kpi-card"><span>Orders today</span><strong>{restaurantMonitoring.reduce((sum, item) => sum + (item.orders_today ?? 0), 0)}</strong><em>{restaurantMonitoring.reduce((sum, item) => sum + (item.processing_orders ?? 0), 0)} processing now</em></div>
                  <div className="stat-card dashboard-kpi-card"><span>Customer activity</span><strong>{restaurantMonitoring.reduce((sum, item) => sum + (item.customers_ordered_today ?? 0), 0)}</strong><em>customers ordered today</em></div>
                  <button className="stat-card dashboard-stat-button dashboard-kpi-card" type="button" onClick={() => onOpenAdministrators()} disabled={!canManageAdministrators}><span>Administrators</span><strong>{summary?.active_system_administrators ?? 0}</strong><em>{summary?.pending_system_administrators ?? 0} pending invitation{summary?.pending_system_administrators === 1 ? '' : 's'}</em></button>
                </div>
                <div className="dashboard-command-columns">
                  <div className="dashboard-monitoring">
                    <div className="dashboard-monitoring-heading"><div><div className="eyebrow">Restaurant Operations</div><h3>Restaurant Activity</h3><p>Operational snapshot across every tenant.</p></div><button className="secondary-button" type="button" onClick={() => onOpenRestaurants()}>Manage restaurants</button></div>
                    {restaurantMonitoring.length === 0 ? <div className="empty-state">No restaurant monitoring data available.</div> : <div className="dashboard-monitoring-table-wrap"><table className="dashboard-monitoring-table"><thead><tr><th>Restaurant</th><th>Status</th><th>Orders</th><th>Processing</th><th>Customers</th><th>Last activity</th></tr></thead><tbody>{restaurantMonitoring.map((monitoring) => <tr key={monitoring.restaurant_id}><td><strong>{monitoring.restaurant_name}</strong></td><td><span className={monitoring.is_active ? 'status active' : 'status inactive'}>{monitoring.is_active ? 'Active' : 'Inactive'}</span></td><td>{monitoring.orders_today}</td><td>{monitoring.processing_orders}</td><td>{monitoring.customers_ordered_today}</td><td className="dashboard-monitoring-last-activity">{monitoring.last_activity ? new Date(monitoring.last_activity).toLocaleString() : 'No activity'}</td></tr>)}</tbody></table></div>}
                  </div>
                  <div className="dashboard-activity"><div className="dashboard-activity-heading"><div><div className="eyebrow">Accountability</div><h3>Recent System Events</h3></div><button className="secondary-button" type="button" onClick={() => onOpenAuditLogs()}>View logs</button></div>{recentLogs.length === 0 ? <div className="empty-state">No recent platform activity.</div> : <div className="dashboard-activity-list">{recentLogs.slice(0, 6).map((log) => <button className="dashboard-activity-row" type="button" key={log.id} onClick={() => onOpenAuditLog(log)}><div><strong>{log.action}</strong><span>{log.admin_name || log.admin_email || 'Unknown administrator'}{log.restaurant_name ? ` • ${log.restaurant_name}` : ''}</span></div><time>{new Date(log.created_at).toLocaleString()}</time></button>)}</div>}</div>
                </div>
              </>
            )}
          </section>
  );
}
