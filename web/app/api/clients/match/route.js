export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalisePhone } from '@/lib/normalise';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone');
    const rawEmail = searchParams.get('email');

    if (!rawPhone && !rawEmail) {
      return NextResponse.json(
        { error: 'Must provide either phone or email parameter' },
        { status: 400 }
      );
    }

    const conditions = [];

    if (rawPhone && rawPhone.trim()) {
      const cleanPhone = normalisePhone(rawPhone);
      if (cleanPhone) {
        conditions.push({ phone: cleanPhone });
      }
    }

    if (rawEmail && rawEmail.trim()) {
      const cleanEmail = rawEmail.trim().toLowerCase();
      if (cleanEmail) {
        conditions.push({ email: cleanEmail });
      }
    }

    if (conditions.length === 0) {
      return NextResponse.json({ client: null });
    }

    const client = await db.client.findFirst({
      where: conditions.length === 1 ? conditions[0] : { OR: conditions },
    });

    return NextResponse.json({ client: client || null });
  } catch (err) {
    console.error('[API Clients Match Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to match client' },
      { status: 500 }
    );
  }
}
