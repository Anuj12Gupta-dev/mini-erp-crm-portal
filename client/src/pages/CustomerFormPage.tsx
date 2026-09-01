import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Customer, CustomerType, CustomerStatus } from '../types';

interface FormState {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gst: string;
  type: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  mobile: '',
  email: '',
  businessName: '',
  gst: '',
  type: 'RETAIL',
  address: '',
  status: 'LEAD',
  followUpDate: '',
  notes: '',
};

export function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<Customer>(`/customers/${id}`).then((res) => {
      const c = res.data;
      setForm({
        name: c.name,
        mobile: c.mobile,
        email: c.email ?? '',
        businessName: c.businessName ?? '',
        gst: c.gst ?? '',
        type: c.type,
        address: c.address ?? '',
        status: c.status,
        followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : '',
        notes: c.notes ?? '',
      });
    });
  }, [id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = {
      ...form,
      email: form.email || undefined,
      businessName: form.businessName || undefined,
      gst: form.gst || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
      followUpDate: form.followUpDate || undefined,
    };
    try {
      if (isEdit) {
        await api.put(`/customers/${id}`, payload);
        navigate(`/customers/${id}`);
      } else {
        const res = await api.post<Customer>('/customers', payload);
        navigate(`/customers/${res.data.id}`);
      }
    } catch {
      setError('Could not save customer. Check the form and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h1>{isEdit ? 'Edit customer' : 'Add customer'}</h1>
      <form onSubmit={handleSubmit}>
        <Field label="Name">
          <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </Field>
        <Field label="Mobile">
          <input
            value={form.mobile}
            onChange={(e) => update('mobile', e.target.value)}
            required
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </Field>
        <Field label="Business name">
          <input
            value={form.businessName}
            onChange={(e) => update('businessName', e.target.value)}
          />
        </Field>
        <Field label="GST">
          <input value={form.gst} onChange={(e) => update('gst', e.target.value)} />
        </Field>
        <Field label="Type">
          <select value={form.type} onChange={(e) => update('type', e.target.value as CustomerType)}>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => update('status', e.target.value as CustomerStatus)}
          >
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
        <Field label="Address">
          <textarea value={form.address} onChange={(e) => update('address', e.target.value)} />
        </Field>
        <Field label="Follow-up date">
          <input
            type="date"
            value={form.followUpDate}
            onChange={(e) => update('followUpDate', e.target.value)}
          />
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </Field>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{ marginTop: 16 }}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <label>{label}</label>
      <br />
      {children}
    </div>
  );
}
