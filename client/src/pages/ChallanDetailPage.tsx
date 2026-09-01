import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Challan } from '../types';

export function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!id) return;
    api.get<Challan>(`/challans/${id}`).then((res) => setChallan(res.data));
  }

  useEffect(reload, [id]);

  const canConfirmOrCancel = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      await api.post(`/challans/${id}/confirm`);
      reload();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Could not confirm challan';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setError(null);
    setBusy(true);
    try {
      await api.post(`/challans/${id}/cancel`);
      reload();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Could not cancel challan';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (!challan) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>{challan.challanNumber}</h1>
        <Link to="/challans">Back to challans</Link>
      </div>

      <dl>
        <dt>Status</dt>
        <dd>{challan.status}</dd>
        <dt>Customer</dt>
        <dd>{challan.customer?.name}</dd>
        <dt>Created by</dt>
        <dd>{challan.createdBy?.name}</dd>
        <dt>Total</dt>
        <dd>{challan.totalAmount}</dd>
      </dl>

      <h2>Items</h2>
      <table width="100%" cellPadding={6} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
            <th>Product</th>
            <th>SKU</th>
            <th>Unit price</th>
            <th>Qty</th>
            <th>Line total</th>
          </tr>
        </thead>
        <tbody>
          {challan.items.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{item.productName}</td>
              <td>{item.productSku}</td>
              <td>{item.unitPrice}</td>
              <td>{item.quantity}</td>
              <td>{item.lineTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        {challan.status === 'DRAFT' && canConfirmOrCancel && (
          <button type="button" onClick={handleConfirm} disabled={busy}>
            Confirm
          </button>
        )}
        {challan.status !== 'CANCELLED' && canConfirmOrCancel && (
          <button type="button" onClick={handleCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
