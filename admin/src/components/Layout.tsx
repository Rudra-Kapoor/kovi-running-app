import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { getApiUrl } from '../api';
import { useAuth } from '../auth';

export function Layout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">K</span>
          <div>
            <div className="brand-name">Kovi Admin</div>
            <div className="brand-sub">internal</div>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/events">Events</NavLink>
          <NavLink to="/users">Users</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="muted small" title={getApiUrl()}>API: {getApiUrl().replace(/^https?:\/\//, '')}</div>
          <div className="small">{admin?.email}</div>
          <button className="btn btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
