import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { hasRole } from '../auth/roles';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import type { Customer, CustomerStatus, Paginated } from '../types';

const STATUS_TONE: Record<CustomerStatus, 'info' | 'success' | 'neutral'> = {
  LEAD: 'info',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
};

export function CustomerListPage() {
  const { user } = useAuth();
  const canManage = hasRole(user?.role, 'ADMIN', 'SALES');
  const [result, setResult] = useState<Paginated<Customer> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<Paginated<Customer>>('/customers', { params: { search: search || undefined, page } })
      .then((res) => {
        if (!cancelled) setResult(res.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, page]);

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        {canManage && (
          <div className="actions">
            <Link to="/customers/new">+ Add customer</Link>
          </div>
        )}
      </div>

      <div className="toolbar">
        <input
          placeholder="Search by name, mobile, business, email..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ maxWidth: 400 }}
        />
      </div>

      {loading && <p>Loading...</p>}

      {result && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Business</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/customers/${c.id}`}>{c.name}</Link>
                    </td>
                    <td>{c.mobile}</td>
                    <td>{c.businessName ?? '-'}</td>
                    <td>{c.type}</td>
                    <td>
                      <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
                {result.data.length === 0 && (
                  <tr>
                    <td colSpan={5}>No customers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
