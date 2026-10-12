import { google } from 'googleapis';
import { sealData, unsealData } from 'iron-session';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'gmail_session';
export const STATE_COOKIE_NAME = 'oauth_state';
const SESSION_PASSWORD =
  process.env.SESSION_SECRET ||
  'complex_password_at_least_32_characters_long_crm_inbox_session_secret_2026';
const TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Creates and returns a new Google OAuth2 client.
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Encrypt session data into a secure sealed string.
 */
export async function sealSession(data) {
  return await sealData(data, { password: SESSION_PASSWORD, ttl: TTL });
}

/**
 * Decrypt a sealed session string.
 */
export async function unsealSession(seal) {
  if (!seal) return null;
  try {
    const data = await unsealData(seal, { password: SESSION_PASSWORD, ttl: TTL });
    return data && typeof data === 'object' && Object.keys(data).length > 0 ? data : null;
  } catch (err) {
    return null;
  }
}

/**
 * Reads and decrypts the session cookie from request or Next.js cookie store.
 */
export async function getSessionFromCookie(req) {
  let cookieVal = null;

  if (req && req.cookies && typeof req.cookies.get === 'function') {
    cookieVal = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else if (req && req.headers) {
    const cookieHeader =
      typeof req.headers.get === 'function'
        ? req.headers.get('cookie')
        : req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(
        new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`)
      );
      cookieVal = match ? decodeURIComponent(match[1]) : null;
    }
  }

  if (!cookieVal) {
    try {
      const cookieStore = cookies();
      cookieVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {}
  }

  if (!cookieVal) return null;
  return await unsealSession(cookieVal);
}

/**
 * Saves sealed session data into the response cookie (7 days, httpOnly, lax).
 */
export async function saveSessionToCookie(res, tokenData) {
  const sealedData = await sealSession(tokenData);
  res.cookies.set(SESSION_COOKIE_NAME, sealedData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL,
  });
}

/**
 * Clears the session cookie from the response.
 */
export function clearSessionCookie(res) {
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Clears the temporary OAuth state cookie from the response.
 */
export function clearStateCookie(res) {
  res.cookies.set(STATE_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Returns an authenticated OAuth2 client and the user's email, or null if unauthenticated.
 * Attaches a 'tokens' event listener so refreshed access tokens can be saved back to the cookie.
 */
export async function getAuthenticatedClient(req) {
  const session = await getSessionFromCookie(req);
  if (!session || (!session.access_token && !session.refresh_token)) {
    return null;
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    scope: session.scope,
    token_type: session.token_type,
    expiry_date: session.expiry_date,
  });

  // Whenever Google auto-refreshes the access token, persist the new tokens
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      const updatedSession = {
        ...session,
        ...newTokens,
        // Preserve refresh_token if Google only sent a new access_token
        refresh_token: newTokens.refresh_token || session.refresh_token,
        email: session.email,
      };
      const sealed = await sealSession(updatedSession);
      const cookieStore = cookies();
      cookieStore.set(SESSION_COOKIE_NAME, sealed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: TTL,
      });
    } catch {
      // ignore cookie update failures in contexts where cookie setting is read-only
    }
  });

  return { oauth2Client, email: session.email };
}
