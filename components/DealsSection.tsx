// components/DealsSection.tsx
import Link from 'next/link';
import { getBaseUrl } from '@/lib/baseUrl';

type Deal = {
  id: string;
  title: string;
  deal_url: string;
  coupon_code: string | null;
  subtitle: string | null;
  published: boolean;
};

async function getDeals(): Promise<Deal[]> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/deals?published=true`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data as Deal[];
}


export default async function DealsSection() {
  const deals = await getDeals();

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <h2 className="text-2xl font-bold mb-6">Cupons e Ofertas</h2>

      {deals.length === 0 ? (
        <p className="text-gray-600">Nenhuma oferta publicada ainda.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((d) => (
            <li
              key={d.id}
              className="rounded border p-4 shadow-sm hover:shadow transition"
            >
              <h3 className="font-semibold">{d.title}</h3>
              {d.subtitle && <p className="mt-1 text-sm text-gray-700">{d.subtitle}</p>}
              {d.coupon_code && (
                <p className="mt-2 text-xs">
                  Cupom: <span className="font-mono">{d.coupon_code}</span>
                </p>
              )}
              <div className="mt-4">
                <Link
                  href={d.deal_url}
                  target="_blank"
                  className="inline-block rounded border px-3 py-2 text-sm"
                >
                  Ir para a oferta
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
