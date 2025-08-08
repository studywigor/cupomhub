// app/api/deals/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Body you accept from the admin UI
type PatchBody = {
  title?: string;
  dealUrl?: string;
  couponCode?: string | null;
  subtitle?: string | null;
  published?: boolean;
};

// Columns you actually update in the DB
type DealUpdate = {
  title?: string;
  deal_url?: string;
  coupon_code?: string | null;
  subtitle?: string | null;
  published?: boolean;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body: PatchBody = await req.json();
  const update: DealUpdate = {};

  if (body.title !== undefined) update.title = body.title;
  if (body.dealUrl !== undefined) update.deal_url = body.dealUrl;
  if (body.couponCode !== undefined) update.coupon_code = body.couponCode ?? null;
  if (body.subtitle !== undefined) update.subtitle = body.subtitle ?? null;
  if (body.published !== undefined) update.published = !!body.published;

  const { data, error } = await supabaseAdmin
    .from('deals')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabaseAdmin.from('deals').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
