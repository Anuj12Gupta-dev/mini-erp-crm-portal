import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Paginated, StockMovement } from '../types';

export function StockMovementLogPage() {
  const [result, setResult] = useState<Paginated<StockMovement> | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    api.get<Paginated<StockMovement>>('/stock-movements', { params: { page } }).then((res) => {
      if (!cancelled) setResult(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Stock movement log</h1>
        <Link to="/products">Back to products</Link>
      </div>

      {result && (
        <>
          <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Reason</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{new Date(m.createdAt).toLocaleString()}</td>
                  <td>
                    {m.product ? (
                      <Link to={`/products/${m.product.id}`}>
                        {m.product.name} ({m.product.sku})
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{m.type}</td>
                  <td>{m.quantity}</td>
                  <td>{m.reason}</td>
                  <td>{m.createdBy?.name ?? '-'}</td>
                </tr>
              ))}
              {result.data.length === 0 && (
                <tr>
                  <td colSpan={6}>No stock movements yet.</td>
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
