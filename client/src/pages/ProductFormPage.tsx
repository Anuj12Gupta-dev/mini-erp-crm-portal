import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Field } from '../components/Field';
import type { Product } from '../types';

interface FormState {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  minStockQty: string;
  location: string;
  openingStock: string;
  imageUrl: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  sku: '',
  category: '',
  unitPrice: '',
  minStockQty: '0',
  location: '',
  openingStock: '0',
  imageUrl: '',
};

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<Product>(`/products/${id}`).then((res) => {
      const p = res.data;
      setForm({
        name: p.name,
        sku: p.sku,
        category: p.category ?? '',
        unitPrice: p.unitPrice,
        minStockQty: String(p.minStockQty),
        location: p.location ?? '',
        openingStock: String(p.currentStock),
        imageUrl: p.imageUrl ?? '',
      });
    });
  }, [id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const presign = await api.post<{ uploadUrl: string; publicUrl: string }>('/uploads/presign', {
        filename: file.name,
        contentType: file.type,
      });
      await fetch(presign.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      update('imageUrl', presign.data.publicUrl);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Could not upload image';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/products/${id}`, {
          name: form.name,
          sku: form.sku,
          category: form.category || undefined,
          unitPrice: form.unitPrice,
          minStockQty: form.minStockQty,
          location: form.location || undefined,
          imageUrl: form.imageUrl || undefined,
        });
        navigate(`/products/${id}`);
      } else {
        const res = await api.post<Product>('/products', {
          name: form.name,
          sku: form.sku,
          category: form.category || undefined,
          unitPrice: form.unitPrice,
          minStockQty: form.minStockQty,
          location: form.location || undefined,
          imageUrl: form.imageUrl || undefined,
          openingStock: form.openingStock,
        });
        navigate(`/products/${res.data.id}`);
      }
    } catch {
      setError('Could not save product. Check the form and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h1>{isEdit ? 'Edit product' : 'Add product'}</h1>
      <form onSubmit={handleSubmit}>
        <Field label="Name">
          <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </Field>
        <Field label="SKU">
          <input value={form.sku} onChange={(e) => update('sku', e.target.value)} required />
        </Field>
        <Field label="Category">
          <input value={form.category} onChange={(e) => update('category', e.target.value)} />
        </Field>
        <Field label="Unit price">
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.unitPrice}
            onChange={(e) => update('unitPrice', e.target.value)}
            required
          />
        </Field>
        <Field label="Min stock alert qty">
          <input
            type="number"
            min="0"
            value={form.minStockQty}
            onChange={(e) => update('minStockQty', e.target.value)}
          />
        </Field>
        <Field label="Location">
          <input value={form.location} onChange={(e) => update('location', e.target.value)} />
        </Field>
        {!isEdit && (
          <Field label="Opening stock">
            <input
              type="number"
              min="0"
              value={form.openingStock}
              onChange={(e) => update('openingStock', e.target.value)}
            />
          </Field>
        )}
        <Field label="Product image">
          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt=""
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
            />
          )}
          <input type="file" accept="image/*" onChange={handleImageSelected} disabled={uploading} />
          {uploading && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Uploading...</span>}
          {uploadError && <p className="error-text">{uploadError}</p>}
        </Field>

        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 16 }}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
