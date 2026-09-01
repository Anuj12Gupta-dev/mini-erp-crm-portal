import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Paginated, Product } from '../types';

export function ProductListPage() {
  const [result, setResult] = useState<Paginated<Product> | null>(null);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<Paginated<Product>>('/products', {
        params: { search: search || undefined, lowStock: lowStockOnly || undefined, page },
      })
      .then((res) => {
        if (!cancelled) setResult(res.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, lowStockOnly, page]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Products</h1>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/stock-movements">Stock movement log</Link>
          <Link to="/products/new">+ Add product</Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <input
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ width: '100%', maxWidth: 400 }}
        />
        <label>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setPage(1);
              setLowStockOnly(e.target.checked);
            }}
          />{' '}
          Low stock only
        </label>
      </div>

      {loading && <p>Loading...</p>}

      {result && (
        <>
          <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit price</th>
                <th>Stock</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>
                    <Link to={`/products/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.sku}</td>
                  <td>{p.category ?? '-'}</td>
                  <td>{p.unitPrice}</td>
                  <td style={{ color: p.isLowStock ? 'crimson' : undefined }}>
                    {p.currentStock}
                    {p.isLowStock ? ' (low)' : ''}
                  </td>
                  <td>{p.location ?? '-'}</td>
                </tr>
              ))}
              {result.data.length === 0 && (
                <tr>
                  <td colSpan={6}>No products found.</td>
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
