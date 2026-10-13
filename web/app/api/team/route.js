export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const members = await db.teamMember.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ members });
  } catch (err) {
    console.error('[API Team Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
