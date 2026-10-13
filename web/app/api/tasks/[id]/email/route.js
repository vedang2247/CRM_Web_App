export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedClient } from '@/lib/google';
import { buildRaw } from '@/lib/mime';
import { taskCode } from '@/lib/normalise';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 100 * 1024;

export async function POST(request, { params }) {
  try {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { client: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { to, subject = '', bodyText = '', templateId } = body;

    // Validate recipient
    if (!to || typeof to !== 'string' || !EMAIL_REGEX.test(to.trim())) {
      return NextResponse.json(
        { error: 'Valid recipient email address (to) is required' },
        { status: 400 }
      );
    }
    const cleanTo = to.trim();

    // Validate bodyText
    if (!bodyText || typeof bodyText !== 'string' || !bodyText.trim()) {
      return NextResponse.json(
        { error: 'Email body cannot be empty' },
        { status: 400 }
      );
    }

    if (Buffer.byteLength(bodyText, 'utf-8') > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Email body exceeds size limit' },
        { status: 400 }
      );
    }

    // Format subject: prepend [TSKxxxx] if not already present
    const code = taskCode(task.id);
    const codeTag = `[${code}]`;
    let cleanSubject = (subject || '').trim();
    if (!cleanSubject.includes(codeTag)) {
      cleanSubject = cleanSubject ? `${codeTag} ${cleanSubject}` : `${codeTag} Task Update`;
    }
    cleanSubject = cleanSubject.slice(0, 500);

    // Authenticate with Gmail
    const auth = await getAuthenticatedClient(request);
    if (!auth) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized or token expired. Please connect Gmail.' },
        { status: 401 }
      );
    }

    const { oauth2Client, email: fromEmail } = auth;
    const raw = buildRaw({
      to: cleanTo,
      from: fromEmail,
      subject: cleanSubject,
      body: bodyText,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const sendResult = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    const gmailMsgId = sendResult.data.id || null;
    const threadId = sendResult.data.threadId || null;

    // Transaction: save TaskEmail record and auto-create corresponding TaskLink
    const [taskEmail, taskLink] = await db.$transaction([
      db.taskEmail.create({
        data: {
          taskId,
          to: cleanTo,
          subject: cleanSubject,
          bodyText,
          gmailMsgId,
          threadId,
        },
      }),
      db.taskLink.create({
        data: {
          taskId,
          type: 'email',
          threadId,
          subject: cleanSubject,
          sender: cleanTo,
          note: null,
        },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        taskEmail,
        taskLink,
      },
      { status: 201 }
    );
  } catch (err) {
    // Redact sensitive contents in logs
    console.error('[API Task Email POST Error]:', {
      message: err?.message,
      code: err?.code,
      status: err?.status,
      body: '[REDACTED]',
      tokens: '[REDACTED]',
    });

    const isAuthError =
      err?.code === 401 ||
      err?.status === 401 ||
      err?.response?.status === 401 ||
      err?.message?.includes('invalid_grant') ||
      err?.message?.includes('invalid_token');

    if (isAuthError) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized or token expired. Please reconnect Gmail.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to send task email' },
      { status: 500 }
    );
  }
}
