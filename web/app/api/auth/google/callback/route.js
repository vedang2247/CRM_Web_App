export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import {
  createOAuth2Client,
  saveSessionToCookie,
  clearStateCookie,
  getSessionFromCookie,
  STATE_COOKIE_NAME,
} from '@/lib/google';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.warn('[Google Callback Error from provider]:', error);
      return NextResponse.redirect(
        new URL(`/connections?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/connections?error=Missing+code+or+state+parameter', request.url)
      );
    }

    // Verify state against cookie
    const stateCookie = request.cookies.get(STATE_COOKIE_NAME)?.value;
    if (!stateCookie || stateCookie !== state) {
      return NextResponse.redirect(
        new URL(
          '/connections?error=OAuth+state+mismatch+or+expired.+Please+try+connecting+again.',
          request.url
        )
      );
    }

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user profile email with resilient fallbacks
    let email = null;

    // Fallback 1: Extract email directly from id_token JWT (zero network overhead, no API required)
    if (tokens.id_token) {
      try {
        const payloadBase64 = tokens.id_token.split('.')[1];
        if (payloadBase64) {
          const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
          const payload = JSON.parse(payloadJson);
          if (payload.email) {
            email = payload.email;
          }
        }
      } catch (e) {
        console.warn('[Google Callback] id_token decode warning:', e.message);
      }
    }

    // Fallback 2: userinfo endpoint via oauth2 API
    if (!email) {
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userinfo = await oauth2.userinfo.get();
        email = userinfo.data?.email;
      } catch (e) {
        console.warn('[Google Callback] userinfo.get warning:', e.message);
      }
    }

    // Fallback 3: Gmail users.getProfile endpoint (uses Gmail API which is already required)
    if (!email) {
      try {
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        email = profile.data?.emailAddress;
      } catch (e) {
        console.warn('[Google Callback] gmail.users.getProfile warning:', e.message);
      }
    }

    if (!email) {
      return NextResponse.redirect(
        new URL('/connections?error=Could+not+retrieve+email+from+Google+profile', request.url)
      );
    }

    // If Google didn't return a refresh_token this time, preserve any previously saved one
    const existingSession = await getSessionFromCookie(request);
    const finalRefreshToken = tokens.refresh_token || existingSession?.refresh_token || null;

    const response = NextResponse.redirect(
      new URL('/connections?gmail=connected', request.url)
    );

    // Save session cookie (7 days)
    await saveSessionToCookie(response, {
      ...tokens,
      refresh_token: finalRefreshToken,
      email,
    });

    // Clear state cookie
    clearStateCookie(response);

    return response;
  } catch (err) {
    console.error('[Google Callback Exception]:', err);
    return NextResponse.redirect(
      new URL(
        `/connections?error=${encodeURIComponent(err.message || 'auth_failed')}`,
        request.url
      )
    );
  }
}
