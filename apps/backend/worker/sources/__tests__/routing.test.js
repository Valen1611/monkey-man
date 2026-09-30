#!/usr/bin/env node
/**
 * Test harness for email source routing and parsers.
 * Run with: `node routing.test.js`.
 */

const fs = require('fs');
const path = require('path');

const { routeSource, routingHeaders, getSource } = require('../index');
const santanderSource = getSource('santander');
const parseTransferEmail = santanderSource ? santanderSource.parseTransferEmail : null;
const { getEmailBody, getEmailBodyHtml } = require('../../gmail/parser');
const { parseMoney } = require('../money');

const DUMPS_DIR = path.join(__dirname, '..', '..', '..', 'dumps');
const UBER_EML = path.join(DUMPS_DIR, 'Tu viaje del sábado por la mañana con Uber.eml');
const hasDumps = fs.existsSync(DUMPS_DIR) && fs.existsSync(UBER_EML);

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`      \x1b[31m${error.message}\x1b[0m`);
  }
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n        Expected: ${JSON.stringify(expected)}\n        Received: ${JSON.stringify(actual)}`);
  }
}

function routeFrom(headers) {
  return routeSource({
    from: headerValue(headers, 'From'),
    subject: headerValue(headers, 'Subject'),
    headers
  });
}

function headerValue(headers, name) {
  const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found ? found.value : '';
}

function dumpToHeaders(fileName) {
  const raw = fs.readFileSync(path.join(DUMPS_DIR, fileName), 'utf-8');
  const RULE = '========================================================';
  const bodyStart = raw.indexOf(RULE, RULE.length);
  const headerBlock = raw.slice(0, bodyStart);
  const body = raw.slice(bodyStart + RULE.length).trim();

  const getHdr = (label) => {
    const line = headerBlock.split(/\r?\n/).find((l) => l.startsWith(label + ': '));
    return line ? line.slice(label.length + 2).trim() : '';
  };

  return {
    headers: [
      { name: 'Message-ID', value: getHdr('Message-ID') },
      { name: 'Date', value: getHdr('Date') || getHdr('Fecha') },
      { name: 'From', value: getHdr('From') || getHdr('De') },
      { name: 'Subject', value: getHdr('Subject') || getHdr('Asunto') }
    ],
    text: body
  };
}

function readEml(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const separator = raw.indexOf('\r\n\r\n') !== -1 ? '\r\n\r\n' : '\n\n';
  const splitAt = raw.indexOf(separator);
  const rawHeaders = raw.slice(0, splitAt).split(/\r?\n/);

  const unfolded = [];
  for (const line of rawHeaders) {
    if (/^[ \t]/.test(line) && unfolded.length) unfolded[unfolded.length - 1] += ' ' + line.trim();
    else unfolded.push(line);
  }

  const headers = unfolded
    .filter((l) => /^[^\s:]+:/.test(l))
    .map((l) => {
      const at = l.indexOf(':');
      return { name: l.slice(0, at).trim(), value: l.slice(at + 1).trim() };
    });

  const transferEncoding = headerValue(headers, 'Content-Transfer-Encoding').toLowerCase();
  let body = raw.slice(splitAt + separator.length);
  if (transferEncoding === 'quoted-printable') {
    body = body
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  return { headers, body };
}

function emlToGmailPayload(eml) {
  const base64url = Buffer.from(eml.body, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return {
    parts: [{ mimeType: 'text/html', body: { data: base64url } }]
  };
}

// ------------------------------------------------ (0) General Contract

section('0. Router Contract');

test('routingHeaders returns expected headers', () => {
  const headers = routingHeaders();
  assert(headers.includes('From'), 'Must include From');
  assert(headers.includes('Subject'), 'Must include Subject');
  assert(headers.includes('X-Mailgun-Tag'), 'Must include X-Mailgun-Tag');
});

test('empty input routes to null', () => {
  const spoofed = routeSource({ from: '', subject: '', headers: [] });
  assertEqual(spoofed, null, 'Empty headers must not match any source');
});

// ------------------------------------------------ (a) Money Parser

section('1. Money Amount Parser');

test('parses both AR and US formats with decimal precision', () => {
  assertEqual(parseMoney('6.000,00'), 6000, 'European/AR format');
  assertEqual(parseMoney('ARS 4,190.00'), 4190, 'US format with prefix');
  assertEqual(parseMoney('$ 1.500'), 1500, 'Thousands separator');
  assertEqual(parseMoney('305,00'), 305, 'Decimal comma');
  assertEqual(parseMoney(''), 0, 'Empty string returns 0');
  assertEqual(parseMoney(null), 0, 'Null returns 0');
  assertEqual(parseMoney('n/a'), 0, 'Non-numeric string returns 0');
});

// ------------------------------------------------ (b) Subject Variance

section('2. Uber Subject Variance');

const SUBJECT_VARIANTS = [
  'Your Saturday morning trip with Uber',
  'Tu viaje del sábado por la tarde con Uber',
  'Tu viaje del domingo por la noche con Uber',
  '=?UTF-8?q?Tu_viaje_del_s=C3=A1bado_por_la_ma=C3=B1ana_con_Uber?=',
  'uber'
];

for (const subject of SUBJECT_VARIANTS) {
  test(`Matches subject variant: ${subject.slice(0, 46)}`, () => {
    const routed = routeSource({
      from: 'Uber Receipts <noreply@uber.com>',
      subject,
      headers: [{ name: 'X-Mailgun-Tag', value: 'completed_receipt' }]
    });
    assertEqual(routed && routed.id, 'uber', 'Must route to uber');
  });
}

test('Receipt tag matches even with empty subject', () => {
  const routed = routeSource({
    from: 'noreply@uber.com',
    subject: '',
    headers: [{ name: 'X-Mailgun-Tag', value: 'completed_receipt' }]
  });
  assertEqual(routed && routed.id, 'uber', 'X-Mailgun-Tag is a valid route fallback');
});

test('Phishing domain containing uber string does not match', () => {
  const spoofed = routeSource({
    from: 'attacker@uber.com.phishing.example',
    subject: 'Your trip with Uber',
    headers: []
  });
  assertEqual(spoofed, null, 'Must not match arbitrary subdomains or suffixes');
});

test('Case and whitespace idempotency in sender', () => {
  const lower = routeSource({ from: 'noreply@uber.com', subject: 'Your trip with Uber', headers: [] });
  const upper = routeSource({ from: '  UBER RECEIPTS <NoReply@Uber.COM> ', subject: 'YOUR TRIP WITH UBER', headers: [] });
  assertEqual(lower && lower.id, 'uber', 'Lower case matches');
  assertEqual(upper && upper.id, 'uber', 'Upper case matches');
});

test('Sender string-only dispatch matches registered senders', () => {
  assertEqual(routeSource('mensajesyavisos@mails.santander.com.ar')?.id, 'santander', 'Santander address matches');
  assertEqual(routeSource('Santander <mensajesyavisos@mails.santander.com.ar>')?.id, 'santander', 'Formatted Santander header matches');
  assertEqual(routeSource('Uber Receipts <noreply@uber.com>')?.id, 'uber', 'Uber domain matches');
  assertEqual(routeSource('unknown@randombank.com'), null, 'Unregistered sender returns null');
});

test('Parser returns null for non-transaction emails from known senders', () => {
  const santander = getSource('santander');
  const promo = santander.parse({ subject: 'Descubrí las promociones de este fin de semana', text: '' });
  assertEqual(promo, null, 'Santander promo returns null');

  const uber = getSource('uber');
  const policyUpdate = uber.parse({ subject: 'Actualizamos nuestros términos y condiciones', text: '', headers: [] });
  assertEqual(policyUpdate, null, 'Uber policy update returns null');
});

test('BaseParser constructor validates contract', () => {
  const { BaseParser } = require('../base-parser');
  let caught = false;
  try {
    new BaseParser({ id: '', senders: [] });
  } catch {
    caught = true;
  }
  assert(caught, 'BaseParser must reject missing id and senders');

  class TestSubclass extends BaseParser {
    constructor() {
      super({ id: 'test-bank', senders: ['bank.com'] });
    }
  }

  const instance = new TestSubclass();
  assertEqual(instance.id, 'test-bank', 'Subclass initializes id');
  assertEqual(instance.senders[0], 'bank.com', 'Subclass initializes senders');
  assertEqual(instance.parseMoney('1.500,50'), 1500.5, 'Subclass inherits parseMoney');
  assertEqual(instance.createEnvelope().source, 'test-bank', 'Subclass inherits createEnvelope');
});

// ------------------------------------------------ (c) Dump-dependent regression tests

if (hasDumps) {
  section('3. Dump Regression Tests');

  const TRANSFER_DUMPS = [
    '1a0cb178cb855e66.txt',
    '1a0d02fe794f06ae.txt',
    '1a0d03c09be8ca4d.txt',
    '1a0d57eac9f5f66c.txt',
    '1a0d9f5df5c8f9e7.txt'
  ];

  for (const fileName of TRANSFER_DUMPS) {
    test(`${fileName}: parsed envelope matches legacy parseTransferEmail`, () => {
      const { headers, text } = dumpToHeaders(fileName);
      const source = routeFrom(headers);
      assertEqual(source.id, 'santander', 'Must route to santander');

      const legacy = parseTransferEmail(text);
      const envelope = source.parse({ messageId: 'x', headers, text, rawHtml: '' });

      assertEqual(envelope.amount, legacy.amount, 'Amount must match legacy parser');
      assert(envelope.amount > 0, 'Amount must be positive');
      assertEqual(envelope.kind, 'transfer', 'Kind must be transfer');
      assertEqual(envelope.source, 'santander', 'Source must be santander');
      assertEqual(envelope.matched, true, 'Matched must be true');
    });
  }

  test('Transfer description follows standardized English format', () => {
    const { headers, text } = dumpToHeaders('1a0cb178cb855e66.txt');
    const envelope = routeFrom(headers).parse({ messageId: 'x', headers, text, rawHtml: '' });
    assert(envelope.description.startsWith('Transfer to '), 'Description must start with Transfer to');
  });

  const uberEml = readEml(UBER_EML);
  const uberPayload = emlToGmailPayload(uberEml);

  function uberContext() {
    return {
      messageId: 'uber-test',
      headers: uberEml.headers,
      subject: headerValue(uberEml.headers, 'Subject'),
      text: getEmailBody(uberPayload),
      rawHtml: getEmailBodyHtml(uberPayload)
    };
  }

  test('Uber envelope conforms to contract', () => {
    const envelope = getSource('uber').parse(uberContext());
    assertEqual(envelope.amount, 4190, 'Total amount parsed');
    assertEqual(envelope.kind, 'expense', 'Kind is expense');
    assertEqual(envelope.source, 'uber', 'Source is uber');
    assertEqual(envelope.merchant, 'Uber', 'Merchant is Uber');
    assertEqual(envelope.matched, true, 'Matched is true');
  });
} else {
  section('3. Dump Regression Tests (Skipped - raw dumps gitignored)');
  console.log('  ℹ️  apps/backend/dumps/ not present in this workspace; skipping raw dump checks.');
}

// ------------------------------------------------ Summary

console.log('\n' + '='.repeat(64));
if (failures.length === 0) {
  console.log(`\x1b[32m\x1b[1m  PASS\x1b[0m  ${passed}/${passed} tests OK`);
  console.log('='.repeat(64));
  process.exit(0);
} else {
  console.log(`\x1b[31m\x1b[1m  FAIL\x1b[0m  ${passed} OK, ${failures.length} failed\n`);
  for (const f of failures) console.log(`  \x1b[31m•\x1b[0m ${f.name}\n    ${f.error.message}\n`);
  console.log('='.repeat(64));
  process.exit(1);
}
