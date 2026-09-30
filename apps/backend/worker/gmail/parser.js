function decodeBase64Url(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Traverses `payload.parts` to find and decode body content.
 *
 * Performs two passes: looks for preferred MIME type first, falling back to text/html
 * across any branch if no text/plain part is found.
 */
function findPart(parts, mimeType) {
  for (const part of parts) {
    if (part.body && part.body.data && part.mimeType === mimeType) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      const nested = findPart(part.parts, mimeType);
      if (nested) return nested;
    }
  }
  return '';
}

function getRawBody(payload, preferMimeType) {
  if (!payload) return '';
  if (payload.parts && payload.parts.length > 0) {
    return findPart(payload.parts, preferMimeType || 'text/plain') || findPart(payload.parts, 'text/html');
  }
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  return '';
}

/**
 * Strips HTML tags and collapses whitespace, returning plain text body.
 */
function getEmailBody(payload) {
  let bodyStr = getRawBody(payload, null);
  if (bodyStr) {
    bodyStr = bodyStr.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  }
  return bodyStr;
}

/**
 * Raw email body without stripping tags. Used by parsers that inspect HTML attributes.
 */
function getEmailBodyRaw(payload, preferMimeType) {
  return getRawBody(payload, preferMimeType || null);
}

/**
 * Returns raw HTML body.
 */
function getEmailBodyHtml(payload) {
  return getRawBody(payload, 'text/html');
}

module.exports = {
  getEmailBody,
  getEmailBodyRaw,
  getEmailBodyHtml
};
