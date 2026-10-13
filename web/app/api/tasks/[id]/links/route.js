export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractEmail } from '@/lib/normalise';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request, { params }) {
  try {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { type, chatId, messageId, snapshot, threadId, subject, sender, note } = body;

    if (!type || !['whatsapp', 'email'].includes(type)) {
      return NextResponse.json(
        { error: "Link type must be either 'whatsapp' or 'email'" },
        { status: 400 }
      );
    }

    const cleanNote = note && typeof note === 'string' ? note.trim().slice(0, 1000) : null;

    if (type === 'whatsapp') {
      if (!chatId || typeof chatId !== 'string' || !chatId.trim()) {
        return NextResponse.json({ error: 'chatId is required for WhatsApp link' }, { status: 400 });
      }
      if (!messageId || typeof messageId !== 'string' || !messageId.trim()) {
        return NextResponse.json({ error: 'messageId is required for WhatsApp link' }, { status: 400 });
      }
      if (!snapshot || typeof snapshot !== 'string' || !snapshot.trim()) {
        return NextResponse.json({ error: 'snapshot is required for WhatsApp link' }, { status: 400 });
      }

      const link = await db.taskLink.create({
        data: {
          taskId,
          type: 'whatsapp',
          chatId: chatId.trim(),
          messageId: messageId.trim(),
          snapshot: snapshot.trim(),
          note: cleanNote,
        },
      });

      return NextResponse.json({ link }, { status: 201 });
    }

    if (type === 'email') {
      if (!threadId || typeof threadId !== 'string' || !threadId.trim()) {
        return NextResponse.json({ error: 'threadId is required for Email link' }, { status: 400 });
      }
      if (!subject || typeof subject !== 'string' || !subject.trim()) {
        return NextResponse.json({ error: 'subject is required for Email link' }, { status: 400 });
      }
      if (!sender || typeof sender !== 'string' || !sender.trim()) {
        return NextResponse.json({ error: 'sender is required for Email link' }, { status: 400 });
      }

      const cleanSender = extractEmail(sender.trim());
      if (!EMAIL_REGEX.test(cleanSender)) {
        return NextResponse.json({ error: 'Valid sender email is required' }, { status: 400 });
      }

      const link = await db.taskLink.create({
        data: {
          taskId,
          type: 'email',
          threadId: threadId.trim(),
          subject: subject.trim().slice(0, 500),
          sender: cleanSender,
          note: cleanNote,
        },
      });

      return NextResponse.json({ link }, { status: 201 });
    }
  } catch (err) {
    console.error('[API Task Links POST Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to create task link' },
      { status: 500 }
    );
  }
}
