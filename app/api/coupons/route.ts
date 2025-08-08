import type { NextRequest } from "next/server";
import * as aws4 from "aws4";

export const runtime = "nodejs";

type Coupon = {
  id: string;
  store: "Amazon";
  title: string;
  code: string;
  description?: string;
  url: string;
  expiresAt?: string;
  verifiedAt?: string;
  tags?: string[];
  uses?: number;
};

const REGION = process.env.AMZ_REGION || "us-east-1"; // Brazil uses us-east-1 for signing
const HOST = process.env.AMZ_ENDPOINT || "webservices.amazon.com.br";
const PATH = "/paapi5/searchitems";

function mask(s?: string) {
  if (!s) return "(missing)";
  return s.slice(0, 4) + "..." + s.slice(-4);
}

function toCoupon(item: any): Coupon | null {
  const asin = item?.ASIN;
  const title = item?.ItemInfo?.Title?.DisplayValue;
  const price = item?.Offers?.Listings?.[0]?.Price?.DisplayAmount;
  const url = item?.DetailPageURL;
  if (!asin || !title || !url) return null;
  return {
    id: `amz-${asin}`,
    store: "Amazon",
    title,
    code: "",
    description: price ? `Preço: ${price}` : undefined,
    url,
    verifiedAt: new Date().toISOString(),
    tags: ["Oferta"],
  };
}

export async function GET(req: NextRequest) {
  // Log masked env values so we know exactly what’s being used
  console.log("PAAPI env in route:", {
    keyId: mask(process.env.AMZ_ACCESS_KEY_ID),
    region: process.env.AMZ_REGION,
    endpoint: process.env.AMZ_ENDPOINT,
    tag: process.env.AMZ_ASSOCIATE_TAG,
  });

  const { searchParams } = new URL(req.url);
  const keywords =
    searchParams.get("q") || "Nike OR Adidas OR iPhone OR Insider";

  const body = JSON.stringify({
    Keywords: keywords,
    SearchIndex: "All",
    ItemCount: 10,
    ItemPage: 1,
    PartnerTag: process.env.AMZ_ASSOCIATE_TAG,
    PartnerType: "Associates",
    Marketplace: "www.amazon.com.br",
    Resources: [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "Offers.Listings.MerchantInfo",
    ],
  });

  const opts: aws4.Request = {
    host: HOST,
    path: PATH,
    service: "ProductAdvertisingAPI",
    region: REGION,
    method: "POST",
    headers: {
      host: HOST,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Amz-Target":
        "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
      "Content-Encoding": "amz-1.0",
    },
    body,
  };

  aws4.sign(opts, {
    accessKeyId: process.env.AMZ_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AMZ_SECRET_ACCESS_KEY as string,
  });

  try {
    const res = await fetch(`https://${HOST}${PATH}`, {
      method: "POST",
      headers: opts.headers as Record<string, string>,
      body,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("PA-API error", res.status, JSON.stringify(data));
      return new Response(JSON.stringify([]), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }

    const items: any[] = data?.SearchResult?.Items || [];
    const coupons = items.map(toCoupon).filter(Boolean) as Coupon[];

    return new Response(JSON.stringify(coupons), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("PA-API fetch error", e?.message || e);
    return new Response(JSON.stringify([]), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  }
}
