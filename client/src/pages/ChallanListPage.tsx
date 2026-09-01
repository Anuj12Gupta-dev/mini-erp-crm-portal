import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Challan, ChallanStatus, Paginated } from '../types';

export function ChallanListPage() {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Challans</h1>
        <Link to="/challans/new">+ New challan</Link>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <input
          placeholder="Search by challan # or customer..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ width: '100%', maxWidth: 400 }}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as ChallanStatus | '');
          }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {result && (
        <>
          <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>
                    <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
                  </td>
                  <td>{c.customer?.name ?? '-'}</td>
                  <td>{c.status}</td>
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

          <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {result.page} of {result.totalPages || 1} ({result.total} total)
            </span>
            <button
              type="button"
              disabled={page >= result.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
