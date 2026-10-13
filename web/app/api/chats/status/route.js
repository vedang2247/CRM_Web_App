export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_STATUSES = new Set(['open', 'resolved']);

/**
 * GET /api/chats/status?chatIds=id1,id2,...
 * Returns { statuses: { [chatId]: status } }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('chatIds');

    if (!raw || !raw.trim()) {
      return NextResponse.json({ statuses: {} });
    }

    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 500); // safety cap

    if (ids.length === 0) {
      return NextResponse.json({ statuses: {} });
    }

    const rows = await db.chatStatus.findMany({
      where: { chatId: { in: ids } },
      select: { chatId: true, status: true },
    });

    const statuses = {};
    rows.forEach(({ chatId, status }) => {
      statuses[chatId] = status;
    });

    return NextResponse.json({ statuses });
  } catch (err) {
    console.error('[API chats/status GET Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to fetch chat statuses' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chats/status
 * Body: { chatId: string, status: 'open' | 'resolved' }
 * Upserts a single chat status row.
 */
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { chatId, status } = body ?? {};

    if (!chatId || typeof chatId !== 'string' || !chatId.trim()) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${[...VALID_STATUSES].join(', ')}` },
        { status: 400 }
      );
    }

    await db.chatStatus.upsert({
      where: { chatId: chatId.trim() },
      update: { status },
      create: { chatId: chatId.trim(), status },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API chats/status PATCH Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to update chat status' },
      { status: 500 }
    );
  }
}
