// app/api/deals/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const publishedOnly = searchParams.get('published') === 'true';
  const query = supabaseAdmin.from('deals').select('*').order('created_at', { ascending: false });
  const { data, error } = publishedOnly ? await query.eq('published', true) : await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, dealUrl, couponCode, subtitle } = body;

  if (!title || !dealUrl) {
    return NextResponse.json({ error: 'title and dealUrl are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('deals')
    .insert({
      title,
      deal_url: dealUrl,
      coupon_code: couponCode ?? null,
      subtitle: subtitle ?? null,
      published: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
