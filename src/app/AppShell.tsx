import type { ReactNode } from 'react';

type AppShellProps = {
  sidebar: ReactNode;
  title: string;
  onSignOut: () => void;
  children: ReactNode;
};

export default function AppShell({ sidebar, title, onSignOut, children }: AppShellProps) {
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
              Administration
            </span>
            <button type="button" className="header-sign-out" onClick={onSignOut}>Sign out</button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
