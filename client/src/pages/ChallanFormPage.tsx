import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Field } from '../components/Field';
import type { Challan, Customer, Paginated, Product } from '../types';

interface LineItem {
  productId: string;
  quantity: string;
}

export function ChallanFormPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{ productId: '', quantity: '1' }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<Paginated<Customer>>('/customers', { params: { pageSize: 100 } })
      .then((res) => setCustomers(res.data.data));
    api
      .get<Paginated<Product>>('/products', { params: { pageSize: 100 } })
      .then((res) => setProducts(res.data.data));
  }, []);

  function productById(id: string) {
    return products.find((p) => p.id === id);
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: '', quantity: '1' }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const estimatedTotal = lines.reduce((sum, line) => {
    const product = productById(line.productId);
    const qty = Number(line.quantity) || 0;
    return sum + (product ? Number(product.unitPrice) * qty : 0);
  }, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const items = lines
      .filter((line) => line.productId && Number(line.quantity) > 0)
      .map((line) => ({ productId: line.productId, quantity: Number(line.quantity) }));

    if (!customerId || items.length === 0) {
      setError('Select a customer and at least one product line.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<Challan>('/challans', { customerId, items });
      navigate(`/challans/${res.data.id}`);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Could not create challan';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h1>New challan</h1>
      <form onSubmit={handleSubmit}>
        <Field label="Customer">
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.businessName ? `(${c.businessName})` : ''} — {c.mobile}
              </option>
            ))}
          </select>
        </Field>

        <h2>Line items</h2>
        {lines.map((line, index) => {
          const product = productById(line.productId);
          return (
            <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <select
                value={line.productId}
                onChange={(e) => updateLine(index, { productId: e.target.value })}
                required
                style={{ flex: 1 }}
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — stock: {p.currentStock}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={line.quantity}
                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                style={{ width: 80 }}
                required
              />
              {product && (
                <span style={{ whiteSpace: 'nowrap' }}>
                  = {(Number(product.unitPrice) * (Number(line.quantity) || 0)).toFixed(2)}
                </span>
              )}
              <button
                type="button"
                className="btn"
                onClick={() => removeLine(index)}
                disabled={lines.length === 1}
              >
                Remove
              </button>
            </div>
          );
        })}
        <button type="button" className="btn" onClick={addLine} style={{ marginTop: 8 }}>
          + Add line
        </button>

        <p style={{ marginTop: 16 }}>
          <strong>Estimated total: {estimatedTotal.toFixed(2)}</strong>
        </p>

        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 16 }}>
          {submitting ? 'Creating...' : 'Create draft challan'}
        </button>
      </form>
    </div>
  );
}
