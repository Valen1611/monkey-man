/**
 * @typedef {Object} ParseContext
 * @property {string} messageId - Gmail message ID
 * @property {string} subject - Email subject line
 * @property {string} text - Stripped plain text email body
 * @property {string} rawHtml - Full HTML body
 * @property {Array<{name: string, value: string}>} headers - Raw email headers
 */

/**
 * @typedef {Object} TransactionEnvelope
 * @property {string} source - Source identifier (e.g. 'bbva', 'santander')
 * @property {'transfer' | 'expense' | 'income' | null} kind - Transaction type
 * @property {number} amount - Monetary amount
 * @property {string|null} occurredAt - ISO-8601 UTC timestamp
 * @property {string|null} merchant - Merchant name
 * @property {string|null} recipient - Recipient entity/name
 * @property {string|null} description - Transaction description
 * @property {string|null} cbuDestino - Destination CBU/account (transfers)
 * @property {string|null} cuentaOrigen - Origin account label/number
 * @property {string|null} externalId - Bank transaction / receipt ID
 * @property {boolean} matched - True if valid transaction
 * @property {Record<string, any>} extra - Additional metadata
 */

const { createEnvelope, getHeader, toIsoUtc, toIsoUtcFromLocalStamp } = require('./envelope');
const { parseMoney } = require('./money');

/**
 * Abstract Base Class for email transaction parsers.
 *
 * All custom bank and receipt parsers can extend this class to ensure
 * a consistent contract, runtime validation, and built-in helper utilities.
 */
class BaseParser {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique identifier for the parser (e.g. 'bbva', 'chase')
   * @param {string[]} options.senders - Email addresses or domains (e.g. ['alerts@bank.com', 'bank.com'])
   * @param {string[]} [options.routingHeaders] - Extra Gmail headers required (defaults to ['From', 'Subject', 'Date'])
   */
  constructor({ id, senders, routingHeaders } = {}) {
    if (!id || typeof id !== 'string') {
      throw new Error(`[BaseParser] 'id' is required and must be a non-empty string.`);
    }
    if (!Array.isArray(senders) || senders.length === 0) {
      throw new Error(`[BaseParser] 'senders' is required and must be a non-empty array of sender emails or domains.`);
    }

    this.id = id.trim().toLowerCase();
    this.senders = senders.map((s) => String(s).trim().toLowerCase());
    this.routingHeaders = Array.isArray(routingHeaders) ? routingHeaders : ['From', 'Subject', 'Date'];
  }

  /**
   * Parses incoming email content into a normalized transaction envelope.
   * Return a TransactionEnvelope if valid, or null if not a transaction (e.g. promo, statement).
   *
   * @abstract
   * @param {ParseContext} ctx
   * @returns {TransactionEnvelope|null}
   */
  parse(_ctx) {
    throw new Error(`[BaseParser] '${this.id}' must implement the 'parse(ctx)' method.`);
  }

  /**
   * Helper: Creates a default envelope initialized with this parser's ID.
   * @returns {TransactionEnvelope}
   */
  createEnvelope() {
    return createEnvelope(this.id);
  }

  /**
   * Helper: Parses money strings into precision numbers (e.g. "$ 1.500,50" -> 1500.5).
   * @param {string|number} raw
   * @returns {number}
   */
  parseMoney(raw) {
    return parseMoney(raw);
  }

  /**
   * Helper: Finds header value case-insensitively.
   * @param {Array<{name: string, value: string}>} headers
   * @param {string} name
   * @returns {string}
   */
  getHeader(headers, name) {
    return getHeader(headers, name);
  }

  /**
   * Helper: Converts date header string to ISO-8601 UTC string.
   * @param {string} dateHeader
   * @returns {string|null}
   */
  toIsoUtc(dateHeader) {
    return toIsoUtc(dateHeader);
  }

  /**
   * Helper: Converts localized timestamp to ISO UTC string.
   * @param {string} stamp
   * @param {number} [offsetMinutes]
   * @returns {string|null}
   */
  toIsoUtcFromLocalStamp(stamp, offsetMinutes) {
    return toIsoUtcFromLocalStamp(stamp, offsetMinutes);
  }
}

module.exports = { BaseParser };
