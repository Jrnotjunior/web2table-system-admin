import type { ReactNode } from 'react';

export type SystemAdminPage = 'dashboard' | 'restaurants' | 'administrators' | 'audit' | 'health' | 'maps';

type Props = {
  activePage: SystemAdminPage;
  accessLevel: 'owner' | 'administrator' | 'view_only' | null;
  onDashboard: () => void;
  onRestaurants: () => void;
  onAdministrators: () => void;
  onAuditLogs: () => void;
  onPlatformHealth: () => void;
  onMapboxUsage: () => void;
};

export default function SystemAdminSidebar({
  activePage, accessLevel, onDashboard, onRestaurants, onAdministrators, onAuditLogs, onPlatformHealth, onMapboxUsage,
}: Props) {
  const item = (page: SystemAdminPage, icon: string, label: string, action: () => void, disabled = false) => (
    <button key={page} type="button" className={activePage === page ? 'sidebar-nav-item active' : 'sidebar-nav-item'} aria-current={activePage === page ? 'page' : undefined} onClick={action} disabled={disabled}>
      <span className="sidebar-nav-icon">{icon}</span>{label}
    </button>
  );

  return (
    <aside className="admin-sidebar" aria-label="System administration navigation">
      <button type="button" className="sidebar-brand" onClick={onDashboard} aria-label="Web2Table System Admin home">
        <img src="/web2table-system-admin/web2table.png?v=20261012" alt="" />
        <span className="sidebar-brand-label">SYSTEM ADMIN</span>
      </button>
      <nav className="sidebar-nav">
        {item('dashboard', '▦', 'Dashboard', onDashboard)}
        {item('restaurants', '▤', 'Restaurants', onRestaurants)}
        {item('administrators', '♙', 'Administrators', onAdministrators, accessLevel !== 'owner')}
        {item('audit', '▧', 'Activity Logs', onAuditLogs)}
        {item('health', '⌁', 'Platform Health', onPlatformHealth)}
        {item('maps', '◎', 'Mapbox Usage', onMapboxUsage)}
      </nav>
      <div className="sidebar-footer"><span className="sidebar-online-dot" />System Admin Console</div>
    </aside>
  );
}
