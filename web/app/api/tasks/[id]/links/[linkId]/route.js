export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const taskId = parseInt(params.id, 10);
    const linkId = parseInt(params.linkId, 10);

    if (isNaN(taskId) || isNaN(linkId)) {
      return NextResponse.json({ error: 'Invalid task ID or link ID' }, { status: 400 });
    }

    const link = await db.taskLink.findFirst({
      where: {
        id: linkId,
        taskId: taskId,
      },
    });

    if (!link) {
      return NextResponse.json({ error: 'Task link not found' }, { status: 404 });
    }

    await db.taskLink.delete({
      where: { id: linkId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API Task Links DELETE Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to delete task link' },
      { status: 500 }
    );
  }
}
