export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(request, { params }) {
  try {
    const templateId = parseInt(params.id, 10);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const existingTemplate = await db.emailTemplate.findUnique({
      where: { id: templateId },
    });
    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const data = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'Template name cannot be empty' }, { status: 400 });
      }
      const cleanName = body.name.trim();
      if (cleanName.length > 150) {
        return NextResponse.json({ error: 'Template name must be 150 characters or less' }, { status: 400 });
      }
      data.name = cleanName;
    }

    if (body.subject !== undefined) {
      if (typeof body.subject !== 'string' || !body.subject.trim()) {
        return NextResponse.json({ error: 'Template subject cannot be empty' }, { status: 400 });
      }
      const cleanSubject = body.subject.trim();
      if (cleanSubject.length > 500) {
        return NextResponse.json({ error: 'Template subject must be 500 characters or less' }, { status: 400 });
      }
      data.subject = cleanSubject;
    }

    if (body.body !== undefined) {
      if (typeof body.body !== 'string' || !body.body.trim()) {
        return NextResponse.json({ error: 'Template body cannot be empty' }, { status: 400 });
      }
      const cleanBody = body.body.trim();
      if (cleanBody.length > 50000) {
        return NextResponse.json({ error: 'Template body exceeds 50000 characters limit' }, { status: 400 });
      }
      data.body = cleanBody;
    }

    const template = await db.emailTemplate.update({
      where: { id: templateId },
      data,
    });

    return NextResponse.json({ template });
  } catch (err) {
    console.error('[API Template PATCH Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const templateId = parseInt(params.id, 10);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const existingTemplate = await db.emailTemplate.findUnique({
      where: { id: templateId },
    });
    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await db.emailTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API Template DELETE Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
