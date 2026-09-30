# Custom Parsers Directory

This folder allows self-hosters to add custom email and transaction parsers to Monkey-Man without modifying core repository files.

## How it works
1. When running with Docker Compose, this directory is mounted directly into the backend and listener containers (`/app/apps/backend/worker/sources/custom`).
2. Any `.js` file placed here that extends `BaseParser` (or exports `{ id, senders, parse }`) is automatically validated and loaded on startup.
3. This directory is strictly gitignored, keeping your private bank parsers safe from accidental commits.

## Quick Start: Creating a Parser

Create a new file (e.g. `./custom-parsers/my-bank.js`):

```javascript
const { BaseParser } = require('./base-parser');

class MyBankParser extends BaseParser {
  constructor() {
    super({
      id: 'my-bank',
      senders: ['alerts@mybank.com']
    });
  }

  parse({ subject, text, headers }) {
    if (!subject.toLowerCase().includes('transfer')) return null;

    const amount = this.parseMoney(text.match(/Amount:\s*\$([\d.,]+)/)?.[1]);
    if (!amount) return null;

    const envelope = this.createEnvelope();
    envelope.kind = 'expense';
    envelope.amount = amount;
    envelope.description = 'Bank Transfer';
    envelope.matched = true;
    return envelope;
  }
}

module.exports = MyBankParser;
```

See the full template in:
`apps/backend/worker/sources/custom/custom-source.example.js`
