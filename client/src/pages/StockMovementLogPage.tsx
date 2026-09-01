import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
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
      <div className="page-header">
        <h1>Stock movement log</h1>
        <div className="actions">
          <Link to="/products">Back to products</Link>
        </div>
      </div>

      {result && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
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
                  <tr key={m.id}>
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
                    <td>
                      <Badge tone={m.type === 'IN' ? 'success' : 'warning'}>{m.type}</Badge>
                    </td>
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
