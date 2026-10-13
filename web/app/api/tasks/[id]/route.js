export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_STATUSES = new Set(['open', 'in_progress', 'waiting', 'resolved', 'closed']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

export async function GET(request, { params }) {
  try {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        client: true,
        assignee: true,
        reviewer: true,
        links: {
          orderBy: { createdAt: 'desc' },
        },
        sentEmails: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (err) {
    console.error('[API Task GET Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const existingTask = await db.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const data = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      const cleanTitle = body.title.trim();
      if (cleanTitle.length > 300) {
        return NextResponse.json({ error: 'Title must be 300 characters or less' }, { status: 400 });
      }
      data.title = cleanTitle;
    }

    if (body.description !== undefined) {
      data.description = body.description === null ? null : String(body.description).trim();
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${Array.from(VALID_STATUSES).join(', ')}` },
          { status: 400 }
        );
      }
      data.status = body.status;
    }

    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.has(body.priority)) {
        return NextResponse.json(
          { error: `Invalid priority. Must be one of: ${Array.from(VALID_PRIORITIES).join(', ')}` },
          { status: 400 }
        );
      }
      data.priority = body.priority;
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate === null || body.dueDate === '') {
        data.dueDate = null;
      } else {
        const d = new Date(body.dueDate);
        if (isNaN(d.getTime())) {
          return NextResponse.json(
            { error: 'Invalid dueDate format. Must be an ISO date string.' },
            { status: 400 }
          );
        }
        data.dueDate = d;
      }
    }

    if (body.clientId !== undefined) {
      if (body.clientId === null || body.clientId === '') {
        data.clientId = null;
      } else {
        const parsed = parseInt(body.clientId, 10);
        if (isNaN(parsed)) return NextResponse.json({ error: 'Invalid clientId' }, { status: 400 });
        data.clientId = parsed;
      }
    }

    if (body.assigneeId !== undefined) {
      if (body.assigneeId === null || body.assigneeId === '') {
        data.assigneeId = null;
      } else {
        const parsed = parseInt(body.assigneeId, 10);
        if (isNaN(parsed)) return NextResponse.json({ error: 'Invalid assigneeId' }, { status: 400 });
        data.assigneeId = parsed;
      }
    }

    if (body.reviewerId !== undefined) {
      if (body.reviewerId === null || body.reviewerId === '') {
        data.reviewerId = null;
      } else {
        const parsed = parseInt(body.reviewerId, 10);
        if (isNaN(parsed)) return NextResponse.json({ error: 'Invalid reviewerId' }, { status: 400 });
        data.reviewerId = parsed;
      }
    }

    const task = await db.task.update({
      where: { id: taskId },
      data,
      include: {
        client: true,
        assignee: true,
        reviewer: true,
        links: {
          orderBy: { createdAt: 'desc' },
        },
        sentEmails: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    return NextResponse.json({ task });
  } catch (err) {
    console.error('[API Task PATCH Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const existingTask = await db.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await db.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API Task DELETE Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
