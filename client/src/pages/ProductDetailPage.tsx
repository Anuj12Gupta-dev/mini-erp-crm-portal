import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Paginated, Product, StockMovement, StockMovementType } from '../types';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
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
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>{product.name}</h1>
        <Link to={`/products/${product.id}/edit`}>Edit</Link>
      </div>

      <dl>
        <dt>SKU</dt>
        <dd>{product.sku}</dd>
        <dt>Category</dt>
        <dd>{product.category ?? '-'}</dd>
        <dt>Unit price</dt>
        <dd>{product.unitPrice}</dd>
        <dt>Current stock</dt>
        <dd style={{ color: product.isLowStock ? 'crimson' : undefined }}>
          {product.currentStock}
          {product.isLowStock ? ' (low stock)' : ''}
        </dd>
        <dt>Min stock alert qty</dt>
        <dd>{product.minStockQty}</dd>
        <dt>Location</dt>
        <dd>{product.location ?? '-'}</dd>
      </dl>

      <h2>Record stock movement</h2>
      <form onSubmit={handleAddMovement} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select value={type} onChange={(e) => setType(e.target.value as StockMovementType)}>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
        <input
          type="number"
          min="1"
          placeholder="Qty"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={{ width: 80 }}
          required
        />
        <input
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          Record
        </button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

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
