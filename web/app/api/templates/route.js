export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const templates = await db.emailTemplate.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (err) {
    console.error('[API Templates GET Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
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

    const { name, subject, body: templateBody } = body;

    // Validate name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }
    const cleanName = name.trim();
    if (cleanName.length > 150) {
      return NextResponse.json({ error: 'Template name must be 150 characters or less' }, { status: 400 });
    }

    // Validate subject
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json({ error: 'Template subject is required' }, { status: 400 });
    }
    const cleanSubject = subject.trim();
    if (cleanSubject.length > 500) {
      return NextResponse.json({ error: 'Template subject must be 500 characters or less' }, { status: 400 });
    }

    // Validate body
    if (!templateBody || typeof templateBody !== 'string' || !templateBody.trim()) {
      return NextResponse.json({ error: 'Template body cannot be empty' }, { status: 400 });
    }
    const cleanBody = templateBody.trim();
    if (cleanBody.length > 50000) {
      return NextResponse.json({ error: 'Template body exceeds 50000 characters limit' }, { status: 400 });
    }

    const template = await db.emailTemplate.create({
      data: {
        name: cleanName,
        subject: cleanSubject,
        body: cleanBody,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    console.error('[API Templates POST Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to create email template' },
      { status: 500 }
    );
  }
}
