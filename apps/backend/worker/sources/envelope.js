/**
 * Shared helpers for source adapters: envelope construction, header lookup,
 * and date normalization.
 *
 * The envelope is the contract between `sources/*` and the rest of the worker.
 * Centralizing it here ensures every source adapter produces a consistent schema.
 */

const ENVELOPE_KEYS = [
  'source',
  'kind',
  'amount',
  'occurredAt',
  'merchant',
  'recipient',
  'description',
  'cbuDestino',
  'cuentaOrigen',
  'externalId',
  'matched',
  'walletName',
  'extra'
];

/** Creates a default envelope with null/false fields. */
function createEnvelope(source) {
  return {
    source,
    kind: null,
    amount: 0,
    occurredAt: null,
    merchant: null,
    recipient: null,
    description: null,
    cbuDestino: null,
    cuentaOrigen: null,
    externalId: null,
    matched: false,
    walletName: null,
    extra: {}
  };
}

/** Case-insensitive header lookup. Returns empty string if not found. */
function getHeader(headers, name) {
  if (!Array.isArray(headers) || !name) return '';
  const target = name.toLowerCase();
  const found = headers.find((h) => h && h.name && h.name.toLowerCase() === target);
  return found && found.value ? found.value : '';
}

/**
 * Normalizes an RFC 2822 Date header to an ISO-8601 UTC string.
 * Returns null if unparseable.
 */
function toIsoUtc(dateHeader) {
  if (!dateHeader) return null;
  const d = new Date(dateHeader);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Converts a localized timestamp string like "12/09/26 8:15 a.m." (dd/mm/yy + 12h)
 * into an ISO-8601 UTC string, accounting for a fixed timezone offset in minutes.
 */
function toIsoUtcFromLocalStamp(stamp, offsetMinutes) {
  if (!stamp) return null;
  const m = String(stamp).match(
    /(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{2,4})[,\s]+(\d{1,2}):(\d{2})\s*([ap])\.?\s*m?\.?/i
  );
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;

  let hour = Number(m[4]) % 12;
  if (m[6].toLowerCase() === 'p') hour += 12;
  const minute = Number(m[5]);

  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - (offsetMinutes || 0) * 60000;
  const d = new Date(utcMs);
  if (Number.isNaN(d.getTime())) return null;

  // Validate actual date existence (avoid roll-over like Feb 31)
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString();
}

module.exports = {
  ENVELOPE_KEYS,
  createEnvelope,
  getHeader,
  toIsoUtc,
  toIsoUtcFromLocalStamp
};
