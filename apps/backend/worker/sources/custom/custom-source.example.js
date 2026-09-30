/**
 * Custom Source Parser Example
 *
 * To add a custom parser:
 * 1. Copy this file into ./custom-parsers/<your-bank>.js
 * 2. Extend BaseParser and declare `id` and `senders`.
 * 3. Implement your parsing logic in `parse({ subject, text, rawHtml, headers })`.
 *    - Return a normalized envelope if valid.
 *    - Return null if the email is not a transaction (e.g. promo, statement, OTP).
 * 4. Use built-in helpers on `this`:
 *    - this.createEnvelope()
 *    - this.parseMoney(rawAmountString)
 *    - this.getHeader(headers, 'Header-Name')
 *    - this.toIsoUtc(dateHeader)
 * 5. The worker automatically validates and loads it on startup.
 */

const { BaseParser } = require('./base-parser');

class MyCustomBankParser extends BaseParser {
  constructor() {
    super({
      // Unique identifier for this source
      id: 'my-custom-bank',

      // Senders handled by this parser (exact emails or domain names)
      senders: ['alerts@mycustombank.com', 'mycustombank.com'],

      // (Optional) Gmail headers needed. Defaults to ['From', 'Subject', 'Date']
      routingHeaders: ['From', 'Subject', 'Date']
    });
  }

  /**
   * @param {import('../base-parser').ParseContext} ctx
   * @returns {import('../base-parser').TransactionEnvelope|null}
   */
  parse({ subject, text, headers }) {
    const subj = (subject || this.getHeader(headers, 'Subject') || '').toLowerCase();

    // 1. Pre-filter: Ignore non-transaction emails (statements, promos, security alerts)
    if (!subj.includes('transfer notification') && !subj.includes('purchase receipt')) {
      return null;
    }

    const body = text || '';

    // 2. Extract transaction fields using regex
    const amountMatch = body.match(/Amount:\s*\$\s*([\d.,]+)/i);
    const recipientMatch = body.match(/To:\s*(.+?)(?=\n|$)/i);

    const amount = this.parseMoney(amountMatch ? amountMatch[1] : 0);
    if (!amount || amount <= 0) {
      return null;
    }

    const recipient = recipientMatch ? recipientMatch[1].trim() : 'Unknown';

    // 3. Build normalized transaction envelope
    const envelope = this.createEnvelope();
    envelope.kind = 'expense'; // 'expense' | 'transfer' | 'income'
    envelope.amount = amount;
    envelope.occurredAt = this.toIsoUtc(this.getHeader(headers, 'Date'));
    envelope.walletName = 'My Custom Bank'; // (Optional) Target wallet name in your DB
    envelope.recipient = recipient;
    envelope.description = `Payment to ${recipient}`;
    envelope.matched = true;

    return envelope;
  }
}

module.exports = MyCustomBankParser;
