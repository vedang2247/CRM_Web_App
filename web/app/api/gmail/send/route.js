export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/gmail/send
 *
 * Body: { to, subject, body, threadId?, inReplyTo?, references? }
 *
 * Returns: { ok: true, id: messageId }
 */

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/google';
import { buildRaw } from '@/lib/mime';

/** Basic email validation regex */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Max body length — 100 KB */
const MAX_BODY_BYTES = 100 * 1024;

export async function POST(request) {
  try {
    const auth = await getAuthenticatedClient(request);
    if (!auth) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { to, subject, body: emailBody, threadId, inReplyTo, references } = body;

    // ── Validation ─────────────────────────────────────────────────
    if (!to || !EMAIL_REGEX.test(to.trim())) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or missing recipient email address' },
        { status: 400 }
      );
    }

    if (!emailBody || !emailBody.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Email body cannot be empty' },
        { status: 400 }
      );
    }

    if (Buffer.byteLength(emailBody, 'utf-8') > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'Email body exceeds 100 KB limit' },
        { status: 400 }
      );
    }

    // ── Build raw MIME message ─────────────────────────────────────
    const { oauth2Client, email: fromEmail } = auth;
    const raw = buildRaw({
      to: to.trim(),
      from: fromEmail,
      subject: (subject || '(No Subject)').trim(),
      body: emailBody,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
    });

    // ── Send via Gmail API ─────────────────────────────────────────
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const sendResult = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        threadId: threadId || undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      id: sendResult.data.id,
      threadId: sendResult.data.threadId,
    });
  } catch (err) {
    console.error('[Gmail Send Error]:', err?.message || err);

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
      { ok: false, error: err?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
