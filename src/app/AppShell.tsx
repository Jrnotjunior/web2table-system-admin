import type { ReactNode } from 'react';

type AppShellProps = {
  sidebar: ReactNode;
  title: string;
  email: string;
  onSignOut: () => void;
  children: ReactNode;
};

export default function AppShell({ sidebar, title, email, onSignOut, children }: AppShellProps) {
  return (
    <div className="admin-layout">
      {sidebar}
      <div className="admin-main">
        <header className="workspace-topbar">
          <div>
            <span className="topbar-kicker">WEB2TABLE PLATFORM</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="topbar-status">
              <span className="sidebar-online-dot" />
              Live updates
            </span>
            <span className="header-account-email">{email}</span>
            <button type="button" className="header-sign-out header-sign-out-icon" aria-label="Sign out" title="Sign out" onClick={onSignOut}>↗</button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
