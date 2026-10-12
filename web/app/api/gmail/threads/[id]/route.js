export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/google';
import { parseThread } from '@/lib/gmailParse';

export async function GET(request, { params }) {
  try {
    const auth = await getAuthenticatedClient(request);
    if (!auth) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Thread ID required' },
        { status: 400 }
      );
    }

    const { oauth2Client } = auth;
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const threadRes = await gmail.users.threads.get({
      userId: 'me',
      id,
      format: 'full',
    });

    const parsed = parseThread(threadRes.data);

    return NextResponse.json({
      ok: true,
      messages: parsed.messages,
    });
  } catch (err) {
    console.error(`[Gmail Thread Detail Error for ${params?.id}]:`, err?.message || err);

    const isAuthError =
      err?.code === 401 ||
      err?.status === 401 ||
      err?.response?.status === 401 ||
      err?.message?.includes('invalid_grant') ||
      err?.message?.includes('invalid_token');

    if (isAuthError) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized or token expired' },
        { status: 401 }
      );
    }

    if (err?.code === 404 || err?.status === 404) {
      return NextResponse.json(
        { ok: false, error: 'Thread not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to fetch thread details' },
      { status: 500 }
    );
  }
}
