import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Customer, FollowUp } from '../types';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reload() {
    if (!id) return;
    api.get<Customer>(`/customers/${id}`).then((res) => setCustomer(res.data));
    api.get<FollowUp[]>(`/customers/${id}/follow-ups`).then((res) => setFollowUps(res.data));
  }

  useEffect(reload, [id]);

  async function handleAddFollowUp(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/customers/${id}/follow-ups`, { note });
      setNote('');
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  if (!customer) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>{customer.name}</h1>
        <Link to={`/customers/${customer.id}/edit`}>Edit</Link>
      </div>

      <dl>
        <dt>Mobile</dt>
        <dd>{customer.mobile}</dd>
        <dt>Email</dt>
        <dd>{customer.email ?? '-'}</dd>
        <dt>Business name</dt>
        <dd>{customer.businessName ?? '-'}</dd>
        <dt>GST</dt>
        <dd>{customer.gst ?? '-'}</dd>
        <dt>Type</dt>
        <dd>{customer.type}</dd>
        <dt>Status</dt>
        <dd>{customer.status}</dd>
        <dt>Address</dt>
        <dd>{customer.address ?? '-'}</dd>
        <dt>Follow-up date</dt>
        <dd>{customer.followUpDate ? customer.followUpDate.slice(0, 10) : '-'}</dd>
        <dt>Notes</dt>
        <dd>{customer.notes ?? '-'}</dd>
      </dl>

      <h2>Follow-ups</h2>
      <form onSubmit={handleAddFollowUp} style={{ marginBottom: 16 }}>
        <input
          placeholder="Add a follow-up note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ width: '100%', maxWidth: 400 }}
        />
        <button type="submit" disabled={submitting} style={{ marginLeft: 8 }}>
          Add
        </button>
      </form>

      <ul>
        {followUps.map((f) => (
          <li key={f.id}>
            <strong>{new Date(f.createdAt).toLocaleString()}</strong> — {f.note}
            {f.createdBy && <em> ({f.createdBy.name})</em>}
          </li>
        ))}
        {followUps.length === 0 && <li>No follow-ups yet.</li>}
      </ul>
    </div>
  );
}
