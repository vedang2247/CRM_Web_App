import sanitizeHtml from 'sanitize-html';

/**
 * Case-insensitive search for a header by name.
 */
export function getHeader(headers = [], name = '') {
  if (!Array.isArray(headers) || !name) return '';
  const target = name.toLowerCase();
  const found = headers.find((h) => h?.name && h.name.toLowerCase() === target);
  return found?.value || '';
}

/**
 * Decodes Gmail's URL-safe base64 encoded string.
 */
export function decodeBase64Url(data = '') {
  if (!data) return '';
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (err) {
    console.warn('[gmailParse] Failed to decode base64Url:', err.message);
    return '';
  }
}

/**
 * Extracts plain text and sanitized HTML bodies from a message payload.
 * Recursively walks nested MIME parts (multipart/alternative, multipart/mixed, etc.)
 */
export function extractBody(payload) {
  if (!payload) return { bodyText: '', bodyHtml: '' };

  let textPart = '';
  let htmlPart = '';

  function walk(part) {
    if (!part) return;

    const mime = (part.mimeType || '').toLowerCase();
    const data = part.body?.data;

    if (data) {
      if (mime === 'text/plain' && !textPart) {
        textPart = decodeBase64Url(data);
      } else if (mime === 'text/html' && !htmlPart) {
        htmlPart = decodeBase64Url(data);
      }
    }

    if (Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        walk(subPart);
      }
    }
  }

  walk(payload);

  // If plain text was not found but HTML was, strip tags to generate a clean text version
  if (!textPart && htmlPart) {
    textPart = sanitizeHtml(htmlPart, {
      allowedTags: [],
      allowedAttributes: {},
    })
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  // Clean HTML with safe tag set
  const safeHtml = htmlPart
    ? sanitizeHtml(htmlPart, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'img',
          'h1',
          'h2',
          'span',
          'style',
        ]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'width', 'height', 'style'],
          '*': ['style', 'class'],
        },
      })
    : '';

  return {
    bodyText: textPart || payload.snippet || '',
    bodyHtml: safeHtml,
  };
}

/**
 * Parses full thread response from gmail.users.threads.get({ format: 'full' })
 */
export function parseThread(thread) {
  if (!thread || !Array.isArray(thread.messages)) return { messages: [] };

  const messages = thread.messages.map((msg) => {
    const headers = msg.payload?.headers || [];
    const { bodyText, bodyHtml } = extractBody(msg.payload);

    let dateStr = getHeader(headers, 'Date');
    if (!dateStr && msg.internalDate) {
      dateStr = new Date(parseInt(msg.internalDate, 10)).toUTCString();
    }

    return {
      id: msg.id,
      threadId: msg.threadId || thread.id,
      from: getHeader(headers, 'From'),
      to: getHeader(headers, 'To'),
      subject: getHeader(headers, 'Subject') || '(No Subject)',
      date: dateStr,
      snippet: msg.snippet || '',
      bodyText,
      bodyHtml,
      messageIdHeader:
        getHeader(headers, 'Message-ID') || getHeader(headers, 'Message-Id'),
      references: getHeader(headers, 'References'),
      labelIds: msg.labelIds || [],
    };
  });

  return { messages };
}

/**
 * Parses a metadata-format thread item into the summary shape used by ThreadList.
 */
export function parseThreadListItem(thread) {
  if (!thread) return null;
  const messages = thread.messages || [];
  const latestMessage = messages[messages.length - 1] || null;
  const firstMessage = messages[0] || null;

  const headers = latestMessage?.payload?.headers || firstMessage?.payload?.headers || [];
  const firstHeaders = firstMessage?.payload?.headers || headers;

  const subject =
    getHeader(firstHeaders, 'Subject') ||
    getHeader(headers, 'Subject') ||
    '(No Subject)';

  const from =
    getHeader(latestMessage?.payload?.headers || [], 'From') ||
    getHeader(firstHeaders, 'From') ||
    '';

  let dateStr =
    getHeader(latestMessage?.payload?.headers || [], 'Date') ||
    getHeader(firstHeaders, 'Date') ||
    '';
  if (!dateStr && latestMessage?.internalDate) {
    dateStr = new Date(parseInt(latestMessage.internalDate, 10)).toISOString();
  }

  const unread = messages.some(
    (m) => Array.isArray(m.labelIds) && m.labelIds.includes('UNREAD')
  );

  return {
    id: thread.id,
    subject,
    from,
    snippet: thread.snippet || latestMessage?.snippet || '',
    date: dateStr,
    unread,
    messageCount: messages.length || 1,
  };
}
