import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { hasRole } from '../auth/roles';
import { Badge } from '../components/Badge';
import type { Challan, ChallanStatus } from '../types';

const STATUS_TONE: Record<ChallanStatus, 'info' | 'success' | 'neutral'> = {
  DRAFT: 'info',
  CONFIRMED: 'success',
  CANCELLED: 'neutral',
};

export function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canConfirmOrCancel = hasRole(user?.role, 'ADMIN', 'WAREHOUSE');
  const [challan, setChallan] = useState<Challan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!id) return;
    api.get<Challan>(`/challans/${id}`).then((res) => setChallan(res.data));
  }

  useEffect(reload, [id]);

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

  async function handleDownloadPdf() {
    const res = await api.get(`/challans/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${challan?.challanNumber ?? 'challan'}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
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
      <div className="page-header">
        <h1>{challan.challanNumber}</h1>
        <div className="actions">
          <button type="button" className="btn" onClick={handleDownloadPdf}>
            Download PDF
          </button>
          <Link to="/challans">Back to challans</Link>
        </div>
      </div>

      <div className="card">
        <dl className="detail-grid">
          <dt>Status</dt>
          <dd>
            <Badge tone={STATUS_TONE[challan.status]}>{challan.status}</Badge>
          </dd>
          <dt>Customer</dt>
          <dd>{challan.customer?.name}</dd>
          <dt>Created by</dt>
          <dd>{challan.createdBy?.name}</dd>
          <dt>Total quantity</dt>
          <dd>{challan.totalQuantity}</dd>
          <dt>Total amount</dt>
          <dd>{challan.totalAmount}</dd>
        </dl>
      </div>

      <h2>Items</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Unit price</th>
              <th>Qty</th>
              <th>Line total</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((item) => (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td>{item.productSku}</td>
                <td>{item.unitPrice}</td>
                <td>{item.quantity}</td>
                <td>{item.lineTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="error-text">{error}</p>}

      {canConfirmOrCancel && (challan.status === 'DRAFT' || challan.status === 'CONFIRMED') && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {challan.status === 'DRAFT' && (
            <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={busy}>
              Confirm
            </button>
          )}
          <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
