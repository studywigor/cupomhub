'use client';
import { useEffect, useState } from 'react';

type Deal = {
  id: string;
  title: string;
  deal_url: string;
  coupon_code: string | null;
  subtitle: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminPage() {
  const [form, setForm] = useState({ title: '', dealUrl: '', couponCode: '', subtitle: '' });
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/deals');
      if (!res.ok) {
        alert('Failed to load deals');
        return;
      }
      const json = await res.json();
      setDeals(json.data);
    })();
  }, [refreshKey]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Create failed');
      setForm({ title: '', dealUrl: '', couponCode: '', subtitle: '' });
      setRefreshKey((x) => x + 1);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const publish = async (id: string, published: boolean) => {
    await fetch(`/api/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    });
    setRefreshKey((x) => x + 1);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this deal?')) return;
    await fetch(`/api/deals/${id}`, { method: 'DELETE' });
    setRefreshKey((x) => x + 1);
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Admin – Deals</h1>

      <form onSubmit={submit} className="space-y-4 border p-4 rounded">
        <div>
          <label className="block text-sm font-medium">Title *</label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Deal link *</label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={form.dealUrl}
            onChange={(e) => setForm({ ...form, dealUrl: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Coupon code</label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={form.couponCode}
            onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Subtitle</label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
        </div>
        <button disabled={loading} className="px-4 py-2 rounded bg-black text-white">
          {loading ? 'Saving…' : 'Save as Draft'}
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">All Deals</h2>
        <ul className="space-y-2">
          {deals.map((d) => (
            <li key={d.id} className="border rounded p-3 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="font-medium">{d.title}</div>
                <div className="text-sm text-gray-600 break-all">{d.deal_url}</div>
                {d.coupon_code && <div className="text-sm">Coupon: {d.coupon_code}</div>}
                {d.subtitle && <div className="text-sm">{d.subtitle}</div>}
                <div className="text-xs">Status: {d.published ? 'Published' : 'Draft'}</div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => publish(d.id, !d.published)}
                >
                  {d.published ? 'Unpublish' : 'Publish'}
                </button>
                <button className="px-3 py-1 border rounded" onClick={() => remove(d.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
