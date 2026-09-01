import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          borderBottom: '1px solid #ddd',
        }}
      >
        <nav style={{ display: 'flex', gap: 16 }}>
          <Link to="/customers">Customers</Link>
          <Link to="/products">Products</Link>
          <Link to="/challans">Challans</Link>
        </nav>
        {user && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>
              {user.name} ({user.role})
            </span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
