"use client";

import React, { useMemo, useState, useEffect } from "react";

// NOTE: This is a single-file React page meant to be dropped into a Vite/Next/CRA project.
// It uses Tailwind utility classes. In Next.js, put this as app/page.tsx or pages/index.tsx
// and make sure Tailwind is configured. No external components required.
//
// ⚠️ Data: starts with mock coupons. Wire the `fetchLiveCoupons()` fn to your backend or
// affiliate feed later. Buttons and layout mimic the vibe of bravocupom.com.br
// without copying assets.

// ---- Types ----
type Coupon = {
  id: string;
  store: "Nike" | "Adidas" | "iShop" | "Insider Store" | "Amazon";
  title: string;
  code: string; // "VER OFERTA" will be represented as empty string
  description?: string;
  url: string; // destination offer or store page
  expiresAt?: string; // ISO date string
  verifiedAt?: string; // ISO date string
  tags?: string[];
  uses?: number;
  lastUsedAt?: string;
};

// ---- Mock data (replace with live feed) ----
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
    code: "", // oferta sem código
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

// ---- Helpers ----
function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return "—";
  }
}

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

// ---- Main App ----
export default function CouponHub() {
  const [query, setQuery] = useState("");
  const [store, setStore] = useState<"Todas" | Coupon["store"]>("Todas");
  const [sort, setSort] = useState<"recent" | "popular" | "expiring">("recent");

  // Persist uses locally so clicks look alive in demo
  const [usesById, setUsesById] = useLocalStorage<Record<string, number>>(
    "coupon-uses",
    {}
  );

  const [coupons, setCoupons] = useState<Coupon[]>(seedCoupons);

  // TODO: Replace with your API endpoint once scraping/feeds are set up
  async function fetchLiveCoupons() {
    try {
      const res = await fetch("/api/coupons?provider=amazon");
      if (!res.ok) throw new Error("Falha ao buscar ofertas da Amazon");
      const data: Coupon[] = await res.json();
      setCoupons(data);
    } catch (e) {
      console.error(e);
      // fallback to seed data if API fails
      setCoupons(seedCoupons);
    }
  }

  const filtered = useMemo(() => {
    let data = coupons.map((c) => ({
      ...c,
      uses: (c.uses || 0) + (usesById[c.id] || 0),
    }));

    if (store !== "Todas") data = data.filter((c) => c.store === store);
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q)) ||
          c.store.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q)
      );
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

  function handleCopy(code: string, id: string) {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setUsesById((m) => ({ ...m, [id]: (m[id] || 0) + 1 }));
  }

  function handleGo(url: string, id: string) {
    setUsesById((m) => ({ ...m, [id]: (m[id] || 0) + 1 }));
    window.open(url, "_blank");
  }

  const stores: ("Todas" | Coupon["store"])[] = [
    "Todas",
    "Nike",
    "Adidas",
    "iShop",
    "Insider Store",
    "Amazon",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-bold">%
            </div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-xl font-extrabold tracking-tight">CupomHub</h1>
              <p className="text-xs text-gray-500">Cupons e ofertas · Brasil</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cupom, loja, tag..."
              className="w-80 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <select
              value={store}
              onChange={(e) => setStore(e.target.value as any)}
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
              onChange={(e) => setSort(e.target.value as any)}
              className="border rounded-xl px-3 py-2 text-sm"
            >
              <option value="recent">Mais recentes</option>
              <option value="popular">Mais usados</option>
              <option value="expiring">Vencendo antes</option>
            </select>
            <button
              onClick={fetchLiveCoupons}
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cupom, loja, tag..."
          className="w-full border rounded-xl px-4 py-2 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={store}
            onChange={(e) => setStore(e.target.value as any)}
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
            onChange={(e) => setSort(e.target.value as any)}
            className="flex-1 border rounded-xl px-3 py-2 text-sm"
          >
            <option value="recent">Mais recentes</option>
            <option value="popular">Mais usados</option>
            <option value="expiring">Vencendo antes</option>
          </select>
          <button
            onClick={fetchLiveCoupons}
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
              onClick={() => setStore(s.name as any)}
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
                  <div className="w-10 h-10 rounded-xl grid place-items-center text-white font-bold"
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

        {/* Footer */}
        <footer className="mt-10 py-10 text-center text-xs text-gray-500">
          <div className="mb-2">© {new Date().getFullYear()} CupomHub</div>
          <div className="mb-4">Não afiliado a Nike, Adidas, iShop ou Insider Store.</div>
          <div className="max-w-3xl mx-auto text-gray-400">
            <p>
              Dica: para manter cupons sempre válidos, conecte este site a uma API
              própria que consome feeds de afiliados (ex.: Awin, CJ, Rakuten, Lomadee)
              ou scrapers que respeitem termos de uso e robots.txt.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

// ---- Amazon provider API (Next.js) ----
// Create /app/api/coupons/route.ts and install the SDK:
//   npm i paapi5-nodejs-sdk
// Then paste the code below. It returns Amazon items as "offer-only" coupons.
/*
import type { NextRequest } from "next/server";
import { Configuration, DefaultApi, SearchItemsRequest } from "paapi5-nodejs-sdk";

export const runtime = "nodejs"; // uses Node crypto

type Coupon = {
  id: string;
  store: "Amazon";
  title: string;
  code: string; // empty for Amazon offers
  description?: string;
  url: string;
  expiresAt?: string;
  verifiedAt?: string;
  tags?: string[];
  uses?: number;
};

const config = new Configuration({
  accessKey: process.env.AMZ_ACCESS_KEY_ID!,
  secretKey: process.env.AMZ_SECRET_ACCESS_KEY!,
  host: process.env.AMZ_ENDPOINT || "webservices.amazon.com",
  region: process.env.AMZ_REGION || "us-east-1",
});

const api = new DefaultApi(config);

function toCoupon(item: any): Coupon | null {
  const asin = item?.ASIN;
  const title = item?.ItemInfo?.Title?.DisplayValue;
  const price = item?.Offers?.Listings?.[0]?.Price?.DisplayAmount;
  const url = item?.DetailPageURL;
  if (!asin || !title || !url) return null;
  const desc = price ? `Preço: ${price}` : undefined;
  return {
    id: `amz-${asin}`,
    store: "Amazon",
    title,
    code: "",
    description: desc,
    url,
    verifiedAt: new Date().toISOString(),
    tags: ["Oferta"],
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // You can pass ?q= to override the default keywords
  const q = searchParams.get("q");
  const keywords = q || "Nike OR Adidas OR iPhone OR Insider";

  const request: SearchItemsRequest = {
    Keywords: keywords,
    SearchIndex: "All",
    PartnerTag: process.env.AMZ_ASSOCIATE_TAG!, // e.g., corredephd-20
    PartnerType: "Associates",
    Marketplace: "www.amazon.com",
    Resources: [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "Offers.Listings.MerchantInfo",
    ],
  };

  try {
    const result = await api.searchItems(request);
    const items = (result?.SearchResult?.Items || []) as any[];
    const coupons = items
      .map(toCoupon)
      .filter(Boolean) as Coupon[];

    return new Response(JSON.stringify(coupons), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("PA-API error", e?.message || e);
    return new Response(JSON.stringify([]), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  }
}

// .env.local
// AMZ_ACCESS_KEY_ID=************************
// AMZ_SECRET_ACCESS_KEY=************************
// AMZ_ASSOCIATE_TAG=corredephd-20
// AMZ_REGION=us-east-1
// AMZ_ENDPOINT=webservices.amazon.com
*/

// ---- OPTIONAL: Scraper outline (Node + Cheerio) ----
// ⚠️ Always check each site's Terms of Use before scraping. Prefer affiliate feeds.
/*
import axios from "axios";
import * as cheerio from "cheerio";

async function scrapeNikeBR(): Promise<Coupon[]> {
  const res = await axios.get("https://www.nike.com/br/promocoes", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const $ = cheerio.load(res.data);
  const items: Coupon[] = [];
  // Parse promo blocks (example selectors, adjust to real DOM)
  $(".promo-card").each((_, el) => {
    const title = $(el).find(".promo-title").text().trim();
    const code = $(el).find(".promo-code").text().trim();
    const url = $(el).find("a").attr("href") || "https://www.nike.com/br";
    items.push({
      id: `nike-${Buffer.from(title).toString("hex").slice(0, 8)}`,
      store: "Nike",
      title: title || "Oferta Nike",
      code,
      url,
      verifiedAt: new Date().toISOString(),
    });
  });
  return items;
}
*/

// ---- OPTIONAL: Validation idea ----
// To validate codes, stand up a server-side job that periodically tests codes
// on public endpoints or via affiliate API status. Avoid automating checkouts.
// Store only still-working codes in your DB; purge expired ones daily.
