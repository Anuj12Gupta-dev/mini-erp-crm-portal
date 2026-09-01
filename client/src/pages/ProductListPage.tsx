import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { hasRole } from '../auth/roles';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import type { Paginated, Product } from '../types';

export function ProductListPage() {
  const { user } = useAuth();
  const canManage = hasRole(user?.role, 'ADMIN', 'WAREHOUSE');
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
      <div className="page-header">
        <h1>Products</h1>
        <div className="actions">
          <Link to="/stock-movements">Stock movement log</Link>
          {canManage && <Link to="/products/new">+ Add product</Link>}
        </div>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ maxWidth: 400 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={lowStockOnly}
            onChange={(e) => {
              setPage(1);
              setLowStockOnly(e.target.checked);
            }}
          />
          Low stock only
        </label>
      </div>

      {loading && <p>Loading...</p>}

      {result && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
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
                  <tr key={p.id}>
                    <td>
                      <Link to={`/products/${p.id}`}>{p.name}</Link>
                    </td>
                    <td>{p.sku}</td>
                    <td>{p.category ?? '-'}</td>
                    <td>{p.unitPrice}</td>
                    <td>
                      {p.currentStock}
                      {p.isLowStock && (
                        <>
                          {' '}
                          <Badge tone="danger">low</Badge>
                        </>
                      )}
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
