/**
 * mime.js — RFC 2822 raw email builder
 *
 * buildRaw() produces a base64url-encoded raw MIME message
 * suitable for gmail.users.messages.send({ requestBody: { raw, threadId } }).
 *
 * Why isolated? MIME encoding has tricky edge cases (non-ASCII subjects,
 * line-length limits, CRLF requirements). Keeping it here makes it
 * independently testable without a live Gmail connection.
 */

/**
 * Encode a subject line that may contain non-ASCII characters into RFC 2047 form.
 * ASCII-only subjects are returned unchanged.
 *
 * @param {string} subject
 * @returns {string}
 */
function encodeSubject(subject = '') {
  // Check if the string is pure ASCII
  if (/^[\x00-\x7F]*$/.test(subject)) {
    return subject;
  }
  // Encode as UTF-8 base64 per RFC 2047
  const b64 = Buffer.from(subject, 'utf-8').toString('base64');
  return `=?UTF-8?B?${b64}?=`;
}

/**
 * Build a base64url-encoded raw MIME message.
 *
 * @param {object} opts
 * @param {string} opts.to           - Recipient email address
 * @param {string} opts.from         - Sender email address (the authenticated Gmail address)
 * @param {string} opts.subject      - Subject line (may contain non-ASCII)
 * @param {string} opts.body         - Plain-text body
 * @param {string} [opts.inReplyTo]  - Message-ID of the message being replied to
 * @param {string} [opts.references] - Space-separated Message-IDs for threading
 * @param {string} [opts.threadId]   - Gmail thread ID (used by the API, not in headers)
 * @returns {string} base64url-encoded MIME message (no padding, URL-safe)
 */
export function buildRaw({ to, from, subject, body, inReplyTo, references }) {
  const CRLF = '\r\n';

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
  ];

  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
  }
  if (references) {
    headers.push(`References: ${references}`);
  }

  const message = headers.join(CRLF) + CRLF + CRLF + (body || '');

  // Encode to base64url (no padding, URL-safe characters)
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
