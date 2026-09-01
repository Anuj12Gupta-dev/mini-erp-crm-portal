import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../types';

const NAV_ITEMS: { to: string; label: string; roles: Role[] }[] = [
  { to: '/customers', label: 'Customers', roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
  { to: '/products', label: 'Products', roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { to: '/challans', label: 'Challans', roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { to: '/stock-movements', label: 'Stock Log', roles: ['ADMIN', 'WAREHOUSE', 'ACCOUNTS'] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <div>
      <header className="app-header">
        <span className="app-brand">Mini ERP + CRM</span>
        <nav className="app-nav">
          {visibleNavItems.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
        {user && (
          <div className="app-user">
            <span>
              {user.name} · {user.role}
            </span>
            <button type="button" className="btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
