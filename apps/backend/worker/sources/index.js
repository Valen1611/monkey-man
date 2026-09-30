const fs = require('fs');
const path = require('path');
const { BaseParser } = require('./base-parser');
const { createEnvelope, getHeader, toIsoUtc, toIsoUtcFromLocalStamp } = require('./envelope');
const { parseMoney } = require('./money');

/**
 * Directories scanned for custom parsers:
 * 1. apps/backend/worker/sources/custom (mounted in Docker Compose)
 * 2. root custom-parsers/ (convenient for local dev without Docker)
 */
const SEARCH_DIRS = [
  path.join(__dirname, 'custom'),
  path.resolve(__dirname, '../../../../custom-parsers')
];

/**
 * Dynamically loads user-defined custom sources from the search directories.
 * Every parser is a pluggable custom source; there are no hardcoded built-in sources.
 */
function loadCustomSources() {
  const loaded = [];
  const seenIds = new Set();
  const seenFiles = new Set();

  for (const dir of SEARCH_DIRS) {
    if (!fs.existsSync(dir)) continue;

    try {
      const files = fs.readdirSync(dir).sort();
      for (const file of files) {
        if (!file.endsWith('.js') || file.endsWith('.example.js') || file.endsWith('.test.js') || file === 'base-parser.js') {
          continue;
        }

        const fullPath = path.resolve(dir, file);
        if (seenFiles.has(fullPath)) continue;
        seenFiles.add(fullPath);

        try {
          delete require.cache[require.resolve(fullPath)];
          let customModule = require(fullPath);

          // Support class constructors (e.g. module.exports = MyParser)
          if (typeof customModule === 'function') {
            try {
              customModule = new customModule();
            } catch (err) {
              console.error(`🔴 [Sources] Error instantiating parser class in "${file}":`, err.message);
              continue;
            }
          }

          const hasValidContract =
            customModule &&
            typeof customModule.id === 'string' &&
            typeof customModule.parse === 'function' &&
            (Array.isArray(customModule.senders) || typeof customModule.matches === 'function');

          if (hasValidContract && !seenIds.has(customModule.id)) {
            seenIds.add(customModule.id);

            // Wrap parse to inject helpers so custom parsers don't rely on relative requires
            const originalParse = customModule.parse.bind(customModule);
            customModule.parse = (ctx) => originalParse({
              createEnvelope,
              getHeader,
              toIsoUtc,
              toIsoUtcFromLocalStamp,
              parseMoney,
              ...ctx
            });

            console.log(`🔌 [Sources] Loaded parser: "${customModule.id}" (${file})`);
            loaded.push(customModule);
          }
        } catch (err) {
          console.error(`🔴 [Sources] Error loading parser "${file}":`, err.message);
        }
      }
    } catch (err) {
      console.error(`🔴 [Sources] Error reading parser directory "${dir}":`, err.message);
    }
  }

  if (loaded.length === 0) {
    console.log('ℹ️ [Sources] 0 parsers loaded. Add your custom bank/receipt parsers to ./custom-parsers/');
  }

  return loaded;
}

const sources = loadCustomSources();

/**
 * Sender dictionary mapping: senderEmailOrDomain -> source
 */
const senderMap = new Map();
for (const source of sources) {
  if (Array.isArray(source.senders)) {
    for (const sender of source.senders) {
      senderMap.set(String(sender).trim().toLowerCase(), source);
    }
  }
}

function getSource(id) {
  return sources.find((s) => s.id === id) || null;
}

function listSources() {
  return sources.slice();
}

/**
 * Union of headers required by all active sources for initial metadata routing.
 */
function routingHeaders() {
  const union = new Set(['From', 'Subject', 'Date']);
  for (const source of sources) {
    for (const header of source.routingHeaders || []) union.add(header);
  }
  return Array.from(union);
}

/**
 * Extracts raw email address from header value:
 * 'Sender <alerts@bank.com>' -> 'alerts@bank.com'
 */
function extractSenderEmail(fromStr) {
  if (!fromStr) return '';
  const match = String(fromStr).match(/<([^>]+)>/);
  const email = (match ? match[1] : fromStr).trim().toLowerCase();
  return email;
}

/**
 * Evaluates incoming email against the sender dictionary.
 * Can be called with either a From string, or an object { from, subject, headers }.
 */
function routeSource(input) {
  const fromHeader = typeof input === 'string' ? input : (input && input.from) || '';
  const email = extractSenderEmail(fromHeader);

  if (email) {
    // 1. Direct address match in sender dictionary
    if (senderMap.has(email)) {
      return senderMap.get(email);
    }

    // 2. Domain match in sender dictionary (e.g. 'uber.com' matches any '@uber.com')
    const at = email.lastIndexOf('@');
    if (at !== -1) {
      const domain = email.slice(at + 1);
      if (senderMap.has(domain)) {
        return senderMap.get(domain);
      }
      for (const [key, source] of senderMap.entries()) {
        if (domain.endsWith('.' + key)) {
          return source;
        }
      }
    }
  }

  // 3. Fallback: custom sources implementing custom matches()
  const ctx = typeof input === 'object' && input !== null
    ? { from: (input.from || '').toLowerCase(), subject: (input.subject || '').toLowerCase(), headers: input.headers || [] }
    : { from: fromHeader.toLowerCase(), subject: '', headers: [] };

  for (const source of sources) {
    if (typeof source.matches === 'function' && source.matches(ctx)) {
      return source;
    }
  }

  return null;
}

module.exports = {
  BaseParser,
  sources,
  senderMap,
  getSource,
  listSources,
  routingHeaders,
  routeSource,
  extractSenderEmail,
  loadCustomSources
};
