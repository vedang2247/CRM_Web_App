export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_STATUSES = new Set(['open', 'in_progress', 'waiting', 'resolved', 'closed']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const clientIdParam = searchParams.get('clientId');
    const assigneeIdParam = searchParams.get('assigneeId');
    const q = searchParams.get('q')?.trim();

    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);

    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20;
    const skip = (page - 1) * limit;

    const where = {};

    if (status && VALID_STATUSES.has(status)) {
      where.status = status;
    }

    if (clientIdParam) {
      const clientId = parseInt(clientIdParam, 10);
      if (!isNaN(clientId)) where.clientId = clientId;
    }

    if (assigneeIdParam) {
      const assigneeId = parseInt(assigneeIdParam, 10);
      if (!isNaN(assigneeId)) where.assigneeId = assigneeId;
    }

    if (q) {
      where.title = { contains: q, mode: 'insensitive' };
    }

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, name: true, phone: true, email: true, company: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          reviewer: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          _count: {
            select: { links: true, sentEmails: true },
          },
        },
      }),
      db.task.count({ where }),
    ]);

    return NextResponse.json({
      tasks,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('[API Tasks GET Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      title,
      description,
      status = 'open',
      priority = 'medium',
      dueDate,
      clientId,
      assigneeId,
      reviewerId,
    } = body;

    // Validate title
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length > 300) {
      return NextResponse.json(
        { error: 'Title must be 300 characters or less' },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Array.from(VALID_STATUSES).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate priority
    if (priority && !VALID_PRIORITIES.has(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${Array.from(VALID_PRIORITIES).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate dueDate
    let parsedDueDate = null;
    if (dueDate) {
      const d = new Date(dueDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: 'Invalid dueDate format. Must be an ISO date string.' },
          { status: 400 }
        );
      }
      parsedDueDate = d;
    }

    // Validate foreign keys if provided
    let parsedClientId = null;
    if (clientId !== undefined && clientId !== null && clientId !== '') {
      parsedClientId = parseInt(clientId, 10);
      if (isNaN(parsedClientId)) {
        return NextResponse.json({ error: 'Invalid clientId' }, { status: 400 });
      }
    }

    let parsedAssigneeId = null;
    if (assigneeId !== undefined && assigneeId !== null && assigneeId !== '') {
      parsedAssigneeId = parseInt(assigneeId, 10);
      if (isNaN(parsedAssigneeId)) {
        return NextResponse.json({ error: 'Invalid assigneeId' }, { status: 400 });
      }
    }

    let parsedReviewerId = null;
    if (reviewerId !== undefined && reviewerId !== null && reviewerId !== '') {
      parsedReviewerId = parseInt(reviewerId, 10);
      if (isNaN(parsedReviewerId)) {
        return NextResponse.json({ error: 'Invalid reviewerId' }, { status: 400 });
      }
    }

    const task = await db.task.create({
      data: {
        title: cleanTitle,
        description: description && typeof description === 'string' ? description.trim() : null,
        status: status || 'open',
        priority: priority || 'medium',
        dueDate: parsedDueDate,
        clientId: parsedClientId,
        assigneeId: parsedAssigneeId,
        reviewerId: parsedReviewerId,
      },
      include: {
        client: true,
        assignee: true,
        reviewer: true,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error('[API Tasks POST Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
