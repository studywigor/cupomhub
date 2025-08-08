"use client";

import React, { useMemo, useState, useEffect } from "react";

// ---- Types ----
type Store = "Nike" | "Adidas" | "iShop" | "Insider Store" | "Amazon" | "Outros";
type Sort = "recent" | "popular" | "expiring";

type Coupon = {
  id: string;
  store: Store;
  title: string;
  code: string; // empty string = offer without code
  description?: string;
  url: string;
  expiresAt?: string;
  verifiedAt?: string;
  tags?: string[];
  uses?: number;
  lastUsedAt?: string;
};

// API deal shape from /api/deals
type DealAPI = {
  id: string;
  title: string;
  deal_url: string;
  coupon_code: string | null;
  subtitle: string | null;
  published: boolean;
};

// ---- Seed data (fallback) ----
const seedCoupons: Coupon[] = [
  {
    id: "nike-10off",
    store: "Nike",
    title: "10% OFF em itens selecionados",
    code: "NIKE10",
    description: "Válido em produtos selecionados. Veja regras no site.",
    url: "https://www.nike.com/br",
    expiresAt: "2025-09-30",
    verifiedAt: new Date().toISOString(),
    tags: ["Seleção", "Outlet"],
    uses: 124,
  },
  {
    id: "adidas-frete-gratis",
    store: "Adidas",
    title: "Frete grátis acima de R$299",
    code: "",
    description: "Aplicado automaticamente no checkout.",
    url: "https://www.adidas.com.br",
    verifiedAt: new Date().toISOString(),
    tags: ["Frete grátis"],
    uses: 342,
  },
  {
    id: "ishop-iphone-5off",
    store: "iShop",
    title: "5% OFF à vista em iPhone selecionado",
    code: "ISHOP5",
    url: "https://www.ishop.com.br",
    expiresAt: "2025-10-15",
    verifiedAt: new Date().toISOString(),
    tags: ["Apple", "iPhone"],
    uses: 67,
  },
  {
    id: "insider-15off",
    store: "Insider Store",
    title: "15% OFF na primeira compra",
    code: "INSIDER15",
    url: "https://www.insiderstore.com.br",
    expiresAt: "2025-12-31",
    verifiedAt: new Date().toISOString(),
    tags: ["Primeira compra"],
    uses: 201,
  },
];

// ---- Utils ----
function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {}
  }, [key]);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

// ---- Page ----
export default function CouponHub() {
  const [query, setQuery] = useState<string>("");
  const [store, setStore] = useState<Store | "Todas">("Todas");
  const [sort, setSort] = useState<Sort>("recent");
  const [usesById, setUsesById] = useLocalStorage<Record<string, number>>("coupon-uses", {});
  const [coupons, setCoupons] = useState<Coupon[]>(seedCoupons);

  // Fetch published deals from your API and map to Coupon type
  async function fetchLiveCoupons(): Promise<void> {
    try {
      const res = await fetch("/api/deals?published=true", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar ofertas");

      const json = await res.json();
      const deals: DealAPI[] = json.data || [];

      const mapped: Coupon[] = deals.map((d) => ({
        id: d.id,
        store: "Outros", // until we add a brand field in DB/admin
        title: d.title,
        code: d.coupon_code ?? "",
        description: d.subtitle ?? undefined,
        url: d.deal_url,
        verifiedAt: new Date().toISOString(),
        tags: d.coupon_code ? ["Cupom"] : ["Oferta"],
      }));

      setCoupons(mapped.length ? mapped : seedCoupons);
    } catch (e) {
      console.error(e);
      setCoupons(seedCoupons);
    }
  }

  // Auto-load DB deals on first render; keep the button for manual refresh
  useEffect(() => {
    void fetchLiveCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stores: ("Todas" | Store)[] = [
    "Todas",
    "Nike",
    "Adidas",
    "iShop",
    "Insider Store",
    "Outros",
  ];

  const filtered = useMemo<Coupon[]>(() => {
    let data = coupons.map((c) => ({
      ...c,
      uses: (c.uses || 0) + (usesById[c.id] || 0),
    }));

    if (store !== "Todas") data = data.filter((c) => c.store === store);
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((c) => {
        const inTitle = c.title.toLowerCase().includes(q);
        const inDesc = (c.description || "").toLowerCase().includes(q);
        const inTags = (c.tags || []).some((t: string) => t.toLowerCase().includes(q));
        const inStore = c.store.toLowerCase().includes(q as string);
        const inCode = (c.code || "").toLowerCase().includes(q);
        return inTitle || inDesc || inTags || inStore || inCode;
      });
    }

    switch (sort) {
      case "popular":
        data.sort((a, b) => (b.uses || 0) - (a.uses || 0));
        break;
      case "expiring":
        data.sort((a, b) => {
          const ax = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
          const bx = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
          return ax - bx;
        });
        break;
      default:
        data.sort((a, b) => {
          const av = a.verifiedAt ? new Date(a.verifiedAt).getTime() : 0;
          const bv = b.verifiedAt ? new Date(b.verifiedAt).getTime() : 0;
          return bv - av;
        });
    }

    return data;
  }, [coupons, store, query, sort, usesById]);

  function handleCopy(code: string, id: string): void {
    if (!code) return;
    void navigator.clipboard.writeText(code);
    setUsesById((m) => ({ ...m, [id]: (m[id] || 0) + 1 }));
  }

  function handleGo(url: string, id: string): void {
    setUsesById((m) => ({ ...m, [id]: (m[id] || 0) + 1 }));
    let finalUrl = url.trim();
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = `https://${finalUrl}`;
  }

  window.open(finalUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-bold">%</div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-xl font-extrabold tracking-tight">CupomHub</h1>
              <p className="text-xs text-gray-500">Cupons e ofertas · Brasil</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <input
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Buscar cupom, loja, tag..."
              className="w-72 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <select
              value={store}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStore(e.target.value as Store | "Todas")}
              className="border rounded-xl px-3 py-2 text-sm"
            >
              {stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as Sort)}
              className="border rounded-xl px-3 py-2 text-sm"
            >
              <option value="recent">Mais recentes</option>
              <option value="popular">Mais usados</option>
              <option value="expiring">Vencendo antes</option>
            </select>
            <button
              onClick={() => void fetchLiveCoupons()}
              className="ml-1 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              title="Atualizar cupons"
            >
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {/* Mobile controls */}
      <div className="md:hidden px-4 py-3 flex flex-col gap-2 border-b">
        <input
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="Buscar cupom, loja, tag..."
          className="w-full border rounded-xl px-4 py-2 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={store}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStore(e.target.value as Store | "Todas")}
            className="flex-1 border rounded-xl px-3 py-2 text-sm"
          >
            {stores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as Sort)}
            className="flex-1 border rounded-xl px-3 py-2 text-sm"
          >
            <option value="recent">Mais recentes</option>
            <option value="popular">Mais usados</option>
            <option value="expiring">Vencendo antes</option>
          </select>
          <button
            onClick={() => void fetchLiveCoupons()}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Promo strip */}
        <div className="mb-6 grid gap-3 md:grid-cols-4 sm:grid-cols-2">
          {[
            { name: "Nike", color: "bg-zinc-900" },
            { name: "Adidas", color: "bg-blue-600" },
            { name: "iShop", color: "bg-emerald-600" },
            { name: "Insider Store", color: "bg-neutral-800" },
          ].map((s) => (
            <button
              key={s.name}
              onClick={() => setStore(s.name as Store)}
              className={`group relative overflow-hidden rounded-2xl p-4 text-left text-white ${s.color}`}
            >
              <div className="text-xs/5 opacity-70">Cupons</div>
              <div className="text-lg font-bold">{s.name}</div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full border-2 border-white/20 group-hover:scale-110 transition" />
            </button>
          ))}
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center text-white font-bold"
                    style={{
                      background:
                        c.store === "Nike"
                          ? "#111"
                          : c.store === "Adidas"
                          ? "#1d4ed8"
                          : c.store === "iShop"
                          ? "#059669"
                          : "#111827",
                    }}
                  >
                    {c.store.split(" ")[0][0]}
                  </div>
                  <div>
                    <h3 className="font-semibold">{c.title}</h3>
                    <div className="text-xs text-gray-500">{c.store}</div>
                  </div>
                </div>
                <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                  {c.tags?.[0] || "Cupom"}
                </span>
              </div>

              {c.description && (
                <p className="text-sm text-gray-600">{c.description}</p>
              )}

              <div className="flex items-center gap-2">
                {c.code ? (
                  <div className="flex-1 font-mono text-sm tracking-widest bg-gray-50 border rounded-xl px-3 py-2 select-all">
                    {c.code}
                  </div>
                ) : (
                  <div className="flex-1 text-sm text-gray-600">Oferta sem código</div>
                )}

                {c.code ? (
                  <button
                    onClick={() => handleCopy(c.code, c.id)}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                    title="Copiar código"
                  >
                    Copiar
                  </button>
                ) : null}

                <button
                  onClick={() => handleGo(c.url, c.id)}
                  className="rounded-xl bg-black text-white px-4 py-2 text-sm hover:opacity-90"
                >
                  Ver oferta
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <div className="flex items-center gap-2">
                  <span>Verificado {formatDate(c.verifiedAt)}</span>
                  <span>•</span>
                  <span>Usos: {c.uses || 0}</span>
                </div>
                <div>Expira: {formatDate(c.expiresAt)}</div>
              </div>
            </article>
          ))}
        </section>

        <footer className="mt-10 py-10 text-center text-xs text-gray-500">
          <div className="mb-2">© {new Date().getFullYear()} CupomHub</div>
          <div className="mb-4">Não afiliado a Nike, Adidas, iShop ou Insider Store.</div>
          <div className="max-w-3xl mx-auto text-gray-400">
            <p>
              Lançamento com ofertas estáticas (sem API). Quando quiser ativar feeds/afiliados,
              adicionamos uma rota /api/coupons e variáveis de ambiente e reimplantamos.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
