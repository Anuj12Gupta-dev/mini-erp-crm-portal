import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { hasRole } from '../auth/roles';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import type { Challan, ChallanStatus, Paginated } from '../types';

const STATUS_TONE: Record<ChallanStatus, 'info' | 'success' | 'neutral'> = {
  DRAFT: 'info',
  CONFIRMED: 'success',
  CANCELLED: 'neutral',
};

export function ChallanListPage() {
  const { user } = useAuth();
  const canCreate = hasRole(user?.role, 'ADMIN', 'SALES');
  const [result, setResult] = useState<Paginated<Challan> | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ChallanStatus | ''>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Paginated<Challan>>('/challans', {
        params: { search: search || undefined, status: status || undefined, page },
      })
      .then((res) => {
        if (!cancelled) setResult(res.data);
      });
    return () => {
      cancelled = true;
    };
  }, [search, status, page]);

  return (
    <div>
      <div className="page-header">
        <h1>Challans</h1>
        {canCreate && (
          <div className="actions">
            <Link to="/challans/new">+ New challan</Link>
          </div>
        )}
      </div>

      <div className="toolbar">
        <input
          placeholder="Search by challan # or customer..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ maxWidth: 400 }}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as ChallanStatus | '');
          }}
          style={{ width: 'auto' }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {result && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
                    </td>
                    <td>{c.customer?.name ?? '-'}</td>
                    <td>
                      <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                    </td>
                    <td>{c.totalAmount}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {result.data.length === 0 && (
                  <tr>
                    <td colSpan={5}>No challans found.</td>
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
