/**
 * Single source of truth for `ParserRule` `keyType` values and key normalization.
 *
 * Consumed across three layers without duplicating strings:
 *   - worker:   worker/rules/rules.js (CJS, `require`)
 *   - API:      app/api/rules/**      (TS, `import`)
 *   - frontend: via GET /api/rules/key-types, returning this schema
 *
 * Why SQLite enum emulation: SQLite does not support native enums in Prisma.
 * Validation is performed application-side, while `@@unique([keyType, keyValue])`
 * prevents duplicate rule creation in the database.
 */

/** Valid key types. Any other keyType will be rejected with HTTP 400. */
const RULE_KEY_TYPES = [
  'CBU',
  'FROM'
];

/**
 * Key types whose values are case-insensitive.
 *
 * CBU retains its original casing (numbers).
 * FROM is normalized to lowercase so casing differences match reliably.
 */
const CASE_INSENSITIVE_KEY_TYPES = ['FROM'];

/** Check whether value is a recognized rule key type. */
function isRuleKeyType(value) {
  return typeof value === 'string' && RULE_KEY_TYPES.indexOf(value) !== -1;
}

/** Check whether this key type requires lowercasing. */
function isCaseInsensitiveKeyType(keyType) {
  return CASE_INSENSITIVE_KEY_TYPES.indexOf(keyType) !== -1;
}

/**
 * Normalizes rule key values idempotently.
 * Returns null if the value is empty, allowing callers to reject invalid rules.
 */
function normalizeKeyValue(keyType, value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return isCaseInsensitiveKeyType(keyType) ? trimmed.toLowerCase() : trimmed;
}

/**
 * Extracts the email address from a From header:
 * 'Uber Receipts <noreply@uber.com>' -> 'noreply@uber.com'
 */
function extractEmailAddress(from) {
  if (!from) return null;
  const match = String(from).match(/<([^>]+)>/);
  const value = match ? match[1] : String(from);
  const trimmed = value.trim();
  return trimmed || null;
}

module.exports = {
  RULE_KEY_TYPES,
  CASE_INSENSITIVE_KEY_TYPES,
  isRuleKeyType,
  isCaseInsensitiveKeyType,
  normalizeKeyValue,
  extractEmailAddress
};
