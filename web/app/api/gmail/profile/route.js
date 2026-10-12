export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/google';

export async function GET(request) {
  try {
    const auth = await getAuthenticatedClient(request);
    if (!auth) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { oauth2Client, email } = auth;
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    return NextResponse.json({
      ok: true,
      email: profile.data?.emailAddress || email,
    });
  } catch (err) {
    console.error('[Gmail Profile Error]:', err?.message || err);
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
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to fetch Gmail profile' },
      { status: 500 }
    );
  }
}
