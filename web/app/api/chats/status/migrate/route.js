export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_STATUSES = new Set(['open', 'resolved']);

/**
 * POST /api/chats/status/migrate
 * Body: { statuses: { [chatId]: string } }
 *
 * One-time migration: imports chatStatus map from localStorage into DB.
 * Uses createMany + skipDuplicates so it is safe to call multiple times
 * (subsequent calls are no-ops for already-migrated rows).
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { statuses } = body ?? {};

    if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses)) {
      return NextResponse.json(
        { error: 'statuses must be a { [chatId]: status } object' },
        { status: 400 }
      );
    }

    const data = Object.entries(statuses)
      .filter(([chatId, status]) => {
        return (
          typeof chatId === 'string' &&
          chatId.trim().length > 0 &&
          VALID_STATUSES.has(status)
        );
      })
      .map(([chatId, status]) => ({ chatId: chatId.trim(), status }));

    if (data.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    const result = await db.chatStatus.createMany({
      data,
      skipDuplicates: true, // already-migrated rows are skipped
    });

    console.log(`[M8 migration] Migrated ${result.count} chat statuses to DB`);
    return NextResponse.json({ ok: true, count: result.count });
  } catch (err) {
    console.error('[API chats/status/migrate POST Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to migrate chat statuses' },
      { status: 500 }
    );
  }
}
