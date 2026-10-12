export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/google';
import { parseThreadListItem } from '@/lib/gmailParse';

export async function GET(request) {
  try {
    const auth = await getAuthenticatedClient(request);
    if (!auth) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { oauth2Client } = auth;
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const pageToken = searchParams.get('pageToken') || undefined;

    // List thread IDs from INBOX matching search query
    const listParams = {
      userId: 'me',
      maxResults: 20,
      pageToken: pageToken || undefined,
    };

    if (q) {
      listParams.q = q;
    } else {
      listParams.labelIds = ['INBOX'];
    }

    const listRes = await gmail.users.threads.list(listParams);
    const threadItems = listRes.data?.threads || [];
    const nextPageToken = listRes.data?.nextPageToken || null;

    if (threadItems.length === 0) {
      return NextResponse.json({
        ok: true,
        threads: [],
        nextPageToken: null,
      });
    }

    // Fetch thread summaries in parallel with metadata format for maximum speed
    const threadDetails = await Promise.all(
      threadItems.map(async (t) => {
        try {
          const detail = await gmail.users.threads.get({
            userId: 'me',
            id: t.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
          });
          return parseThreadListItem(detail.data);
        } catch (err) {
          console.warn(`[Gmail API] Failed to fetch thread ${t.id}:`, err.message);
          return null;
        }
      })
    );

    const validThreads = threadDetails.filter(Boolean);

    return NextResponse.json({
      ok: true,
      threads: validThreads,
      nextPageToken,
    });
  } catch (err) {
    console.error('[Gmail Threads API Error]:', err?.message || err);

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
      { ok: false, error: err.message || 'Failed to fetch Gmail threads' },
      { status: 500 }
    );
  }
}
