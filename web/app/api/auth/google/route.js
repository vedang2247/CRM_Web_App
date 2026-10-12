export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createOAuth2Client, STATE_COOKIE_NAME } from '@/lib/google';

export async function GET() {
  try {
    const oauth2Client = createOAuth2Client();
    const state = crypto.randomBytes(16).toString('hex');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
    });

    const response = NextResponse.redirect(authUrl);

    // Store state in a short-lived httpOnly cookie (10 minutes)
    response.cookies.set(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });

    return response;
  } catch (err) {
    console.error('[Google Auth Error]:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
  }
}
