export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taskCode } from '@/lib/normalise';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId || typeof chatId !== 'string' || !chatId.trim()) {
      return NextResponse.json({ error: 'chatId parameter is required' }, { status: 400 });
    }

    const cleanChatId = chatId.trim();

    const links = await db.taskLink.findMany({
      where: {
        chatId: cleanChatId,
        type: 'whatsapp',
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const taskCodes = Array.from(
      new Set(links.map((link) => (link.task ? taskCode(link.task.id) : null)).filter(Boolean))
    );

    return NextResponse.json({
      count: links.length,
      taskCodes,
      links,
    });
  } catch (err) {
    console.error('[API Chats Linked-Tasks Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to fetch linked tasks for chat' },
      { status: 500 }
    );
  }
}
