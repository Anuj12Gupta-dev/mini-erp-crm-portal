import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { hasRole } from '../auth/roles';
import { Badge } from '../components/Badge';
import type { Paginated, Product, StockMovement, StockMovementType } from '../types';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canManage = hasRole(user?.role, 'ADMIN', 'WAREHOUSE');
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState<StockMovementType>('IN');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reload() {
    if (!id) return;
    api.get<Product>(`/products/${id}`).then((res) => setProduct(res.data));
    api
      .get<Paginated<StockMovement>>('/stock-movements', { params: { productId: id } })
      .then((res) => setMovements(res.data.data));
  }

  useEffect(reload, [id]);

  async function handleAddMovement(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/products/${id}/stock-movements`, { quantity, type, reason });
      setQuantity('');
      setReason('');
      reload();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Could not record stock movement';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!product) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h1>{product.name}</h1>
        {canManage && (
          <div className="actions">
            <Link to={`/products/${product.id}/edit`}>Edit</Link>
          </div>
        )}
      </div>

      <div className="card">
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6, marginBottom: 16 }}
          />
        )}
        <dl className="detail-grid">
          <dt>SKU</dt>
          <dd>{product.sku}</dd>
          <dt>Category</dt>
          <dd>{product.category ?? '-'}</dd>
          <dt>Unit price</dt>
          <dd>{product.unitPrice}</dd>
          <dt>Current stock</dt>
          <dd>
            {product.currentStock}
            {product.isLowStock && (
              <>
                {' '}
                <Badge tone="danger">low stock</Badge>
              </>
            )}
          </dd>
          <dt>Min stock alert qty</dt>
          <dd>{product.minStockQty}</dd>
          <dt>Location</dt>
          <dd>{product.location ?? '-'}</dd>
        </dl>
      </div>

      {canManage && (
        <>
          <h2>Record stock movement</h2>
          <form onSubmit={handleAddMovement} className="toolbar">
            <select value={type} onChange={(e) => setType(e.target.value as StockMovementType)} style={{ width: 90 }}>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
            <input
              type="number"
              min="1"
              placeholder="Qty"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ width: 90 }}
              required
            />
            <input
              placeholder="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ maxWidth: 240 }}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              Record
            </button>
          </form>
          {error && <p className="error-text">{error}</p>}
        </>
      )}

      <h2>Movement history</h2>
      <ul>
        {movements.map((m) => (
          <li key={m.id}>
            <strong>{new Date(m.createdAt).toLocaleString()}</strong> — {m.type} {m.quantity} (
            {m.reason}) {m.createdBy && <em>by {m.createdBy.name}</em>}
          </li>
        ))}
        {movements.length === 0 && <li>No stock movements yet.</li>}
      </ul>
    </div>
  );
}
