#!/usr/bin/env node
/**
 * Tests for `ParserRule` dictionary routing logic.
 * Run directly with: `node parser-rules.test.js`.
 *
 * Uses an in-memory fake database matching the Prisma API surface required by the worker.
 */

const { applyRules } = require('../rules');
const { normalizeKeyValue } = require('../../../src/lib/ruleKeyTypes');
const { ENVELOPE_KEYS, createEnvelope } = require('../../sources/envelope');

// ---------------------------------------------------------------- Test Harness

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message}\n        Expected: ${JSON.stringify(expected)}\n        Received: ${JSON.stringify(actual)}`
    );
  }
}

async function run() {
  let passed = 0;
  const failures = [];

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    } catch (error) {
      failures.push({ name, error });
      console.log(`  \x1b[31m✗\x1b[0m ${name}`);
      console.log(`      \x1b[31m${error.message}\x1b[0m`);
    }
  }

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
}

// ----------------------------------------------------------------- Fixtures

const CAT_INTERNAL_TRANSFER = 'cat-internal-transfer';
const CAT_TRANSPORT = 'cat-transport';
const WALLET_PRIMARY = 'wallet-primary';
const WALLET_SAVINGS = 'wallet-savings';

const MOCK_CBU = '0000000000000000000000';
const MOCK_ACCOUNT = 'Checking Account XXX-XXX 0000';

const SEEDED_RULES = [
  {
    id: 'rule-1',
    keyType: 'CBU',
    keyValue: MOCK_CBU,
    categoryId: CAT_INTERNAL_TRANSFER,
    walletId: WALLET_PRIMARY,
    isMine: true,
  },
  {
    id: 'rule-2',
    keyType: 'FROM',
    keyValue: 'uber.com',
    categoryId: CAT_TRANSPORT,
    walletId: WALLET_PRIMARY,
    isMine: false,
  },
];

function fakeDb(rows = SEEDED_RULES, { failOn = null, wallets = [] } = {}) {
  const queries = [];
  return {
    queries,
    parserRule: {
      async findUnique({ where }) {
        const { keyType, keyValue } = where.keyType_keyValue;
        queries.push({ keyType, keyValue });
        if (failOn === keyType) throw new Error('SQLITE_BUSY: database is locked');
        return rows.find((r) => r.keyType === keyType && r.keyValue === keyValue) || null;
      },
    },
    wallet: {
      async findUnique({ where }) {
        if (where.id !== undefined) return wallets.find((w) => w.id === where.id) || null;
        return wallets.find((w) => w.name === where.name) || null;
      },
      async findFirst({ where } = {}) {
        if (where && where.isDeleted === false) {
          return wallets.find((w) => !w.isDeleted) || null;
        }
        return wallets[0] || null;
      },
    },
  };
}

function queriesFor(db, keyType) {
  return db.queries.filter((q) => q.keyType === keyType);
}

function mockTransfer(overrides = {}) {
  const env = createEnvelope('santander');
  return Object.assign(env, {
    kind: 'transfer',
    amount: 1500,
    occurredAt: '2026-09-22T21:47:55.000Z',
    merchant: null,
    recipient: 'John Doe',
    description: 'Transfer to John Doe',
    cbuDestino: MOCK_CBU,
    cuentaOrigen: MOCK_ACCOUNT,
    externalId: '12345678',
    matched: true,
    extra: {},
    ...overrides,
  });
}

function mockExpense(overrides = {}) {
  const env = createEnvelope('uber');
  return Object.assign(env, {
    kind: 'expense',
    amount: 4190,
    occurredAt: '2026-09-12T11:15:00.000Z',
    merchant: 'Uber',
    recipient: 'Uber',
    description: 'Uber — Ride',
    cbuDestino: null,
    cuentaOrigen: null,
    externalId: 'e982eff4-d49c-5012-984c-00dba390f756',
    matched: true,
    extra: { vehicleType: 'UberX' },
    ...overrides,
  });
}

async function withSilencedErrors(fn) {
  const original = console.error;
  const seen = [];
  console.error = (...args) => seen.push(args.join(' '));
  try {
    return { result: await fn(), seen };
  } finally {
    console.error = original;
  }
}

// ------------------------------------------------------------------ Contract

section('0. Contract Verification');

test('applyRules returns full envelope and 4 rule fields', async () => {
  const result = await applyRules(mockTransfer(), { prisma: fakeDb() });
  for (const key of ENVELOPE_KEYS) {
    assert(key in result, `Missing envelope key: ${key}`);
  }
  for (const key of ['categoryId', 'walletId', 'isInternalTransfer', 'toWalletId']) {
    assert(key in result, `Missing rule field: ${key}`);
  }
  assertEqual(result.amount, 1500, 'Amount must not be altered by rules');
  assertEqual(result.externalId, '12345678', 'External ID must not be altered');
});

test('queries composite UNIQUE key (keyType_keyValue)', async () => {
  const db = fakeDb();
  await applyRules(mockTransfer(), { prisma: db });
  assert(db.queries.length > 0, 'Database query expected');
  for (const q of db.queries) {
    assert(
      typeof q.keyType === 'string' && typeof q.keyValue === 'string',
      `Malformed query: ${JSON.stringify(q)}`
    );
  }
  assert(queriesFor(db, 'CBU').length === 1, 'CBU should be resolved once per envelope');
});

test('optional logger receives DB errors', async () => {
  const logs = [];
  const db = fakeDb([], { failOn: 'CBU' });
  await withSilencedErrors(async () =>
    applyRules(mockTransfer(), { prisma: db, log: (m) => logs.push(m) })
  );
  assert(logs.length > 0, 'Database error should be logged');
});

// ------------------------------------------------------------ CBU Rules

section('1. CBU — Internal Transfer Resolution');

test('CBU rule resolves category, isInternalTransfer, and toWalletId', async () => {
  const result = await applyRules(mockTransfer(), { prisma: fakeDb() });
  assertEqual(result.categoryId, CAT_INTERNAL_TRANSFER, 'Category resolved from CBU rule');
  assertEqual(result.isInternalTransfer, true, 'isMine flag marks internal transfer');
  assertEqual(result.toWalletId, WALLET_PRIMARY, 'Target wallet assigned from CBU rule walletId');
});

test('CBU with isMine=false does NOT mark internal transfer', async () => {
  const db = fakeDb([
    { id: 'r', keyType: 'CBU', keyValue: MOCK_CBU, categoryId: CAT_TRANSPORT, walletId: null, isMine: false },
  ]);
  const result = await applyRules(mockTransfer(), { prisma: db });
  assertEqual(result.categoryId, CAT_TRANSPORT, 'Category rule still applies');
  assertEqual(result.isInternalTransfer, false, 'Not marked as internal transfer');
  assertEqual(result.toWalletId, null, 'No toWalletId when not internal');
});

test('Envelope CBU is trimmed before querying', async () => {
  const db = fakeDb();
  const result = await applyRules(mockTransfer({ cbuDestino: `  ${MOCK_CBU}  ` }), {
    prisma: db,
  });
  assertEqual(queriesFor(db, 'CBU')[0].keyValue, MOCK_CBU, 'Query key must be trimmed');
  assertEqual(result.isInternalTransfer, true, 'Matches padded input');
});

test('Null cbuDestino does not execute CBU query', async () => {
  const db = fakeDb();
  await applyRules(mockTransfer({ cbuDestino: null }), { prisma: db });
  assertEqual(queriesFor(db, 'CBU').length, 0, 'Does not query DB with empty key');
});

// -------------------------------------------------------- Wallet Resolution

section('2. Wallet — Parser walletName > FROM Rule > Default Fallback');

test('envelope.walletName resolves wallet directly by name', async () => {
  const db = fakeDb([], { wallets: [{ id: WALLET_SAVINGS, name: 'Santander' }] });
  const result = await applyRules(mockTransfer({ walletName: 'Santander' }), { prisma: db });
  assertEqual(result.walletId, WALLET_SAVINGS, 'Parser wallet name resolved directly');
});

test('FROM rule resolves wallet from dictionary rule', async () => {
  const result = await applyRules(mockExpense({ walletName: null }), { prisma: fakeDb(), from: 'Uber <receipts@uber.com>' });
  assertEqual(result.walletId, WALLET_PRIMARY, 'Sender domain rule resolves wallet');
});

test('Parser-declared walletName takes precedence over FROM rule', async () => {
  const db = fakeDb([
    { id: 'f', keyType: 'FROM', keyValue: 'uber.com', categoryId: null, walletId: WALLET_SAVINGS, isMine: false },
  ], { wallets: [{ id: WALLET_PRIMARY, name: 'Santander' }, { id: WALLET_SAVINGS, name: 'Savings' }] });
  const result = await applyRules(
    mockExpense({ walletName: 'Santander' }),
    { prisma: db, from: 'Uber <receipts@uber.com>' }
  );
  assertEqual(result.walletId, WALLET_PRIMARY, 'Parser walletName takes precedence');
});

test('Without matching wallet, falls back to default wallet if configured', async () => {
  const result = await applyRules(
    mockExpense({ walletName: null }),
    { prisma: fakeDb([], { wallets: [{ id: WALLET_SAVINGS, name: 'Checking Account' }] }), from: null }
  );
  assertEqual(result.walletId, WALLET_SAVINGS, 'Default wallet resolved');
});

// ------------------------------------------------- Key Normalization

section('3. Key Normalization');

test('FROM matches case-insensitively', async () => {
  for (const from of ['noreply@uber.com', 'NoReply@Uber.COM', ' NOREPLY@UBER.COM ']) {
    const db = fakeDb([
      { id: 'f', keyType: 'FROM', keyValue: 'noreply@uber.com', categoryId: CAT_TRANSPORT, walletId: WALLET_PRIMARY, isMine: false },
    ]);
    const result = await applyRules(mockExpense({ walletName: null }), { prisma: db, from });
    assertEqual(result.walletId, WALLET_PRIMARY, `"${from}" should match rule "noreply@uber.com"`);
  }
});

test('normalizeKeyValue is idempotent and trims whitespace', () => {
  assertEqual(normalizeKeyValue('FROM', '  Uber.COM  '), 'uber.com', 'Lowercase and trimmed');
  assertEqual(normalizeKeyValue('FROM', 'uber.com'), 'uber.com', 'Idempotent');
  assertEqual(normalizeKeyValue('CBU', '  123 '), '123', 'Trim without lowercase');
  assertEqual(normalizeKeyValue('CBU', ''), null, 'Empty string returns null');
  assertEqual(normalizeKeyValue('CBU', '   '), null, 'Whitespace only returns null');
  assertEqual(normalizeKeyValue('CBU', null), null, 'Null returns null');
});

// --------------------------------------------------- Sender Rules

section('4. Sender-Based Rules (FROM)');

test('FROM matches exact address', async () => {
  const db = fakeDb([
    { id: 'f', keyType: 'FROM', keyValue: 'noreply@uber.com', categoryId: CAT_TRANSPORT, walletId: null, isMine: false },
  ]);
  const matching = await applyRules(mockExpense({ walletName: null }), { prisma: db, from: 'Uber <noreply@uber.com>' });
  assertEqual(matching.categoryId, CAT_TRANSPORT, 'Matches exact address');

  const other = await applyRules(mockExpense({ walletName: null }), { prisma: db, from: 'Other <noreply@other.com>' });
  assertEqual(other.categoryId, null, 'Does not match other address');
});

test('FROM matches domain fallback', async () => {
  const db = fakeDb([
    { id: 'f', keyType: 'FROM', keyValue: 'uber.com', categoryId: CAT_TRANSPORT, walletId: null, isMine: false },
  ]);
  const matching = await applyRules(mockExpense({ walletName: null }), { prisma: db, from: 'Uber Receipts <random-hash@uber.com>' });
  assertEqual(matching.categoryId, CAT_TRANSPORT, 'Matches domain when exact email has no rule');
});

// -------------------------------------------------------- Category Precedence

section('5. Category Precedence Order');

test('CBU rule takes precedence over FROM rule', async () => {
  const db = fakeDb([
    { id: 'c', keyType: 'CBU', keyValue: MOCK_CBU, categoryId: CAT_INTERNAL_TRANSFER, walletId: WALLET_PRIMARY, isMine: true },
    { id: 'f', keyType: 'FROM', keyValue: 'bank.com', categoryId: CAT_TRANSPORT, walletId: null, isMine: false },
  ]);
  const result = await applyRules(mockTransfer(), { prisma: db, from: 'Bank <no-reply@bank.com>' });
  assertEqual(result.categoryId, CAT_INTERNAL_TRANSFER, 'CBU is highest priority signal');
});

test('Without matching rule, category is null', async () => {
  const db = fakeDb([]);
  const result = await applyRules(mockExpense(), { prisma: db, from: null });
  assertEqual(result.categoryId, null, 'Unmatched transaction has null category');
});

// ---------------------------------------------------- Default Wallet Fallback

section('6. Default Wallet Resolution');

test('DEFAULT_WALLET_NAME configures fallback wallet by name', async () => {
  const previous = process.env.DEFAULT_WALLET_NAME;
  process.env.DEFAULT_WALLET_NAME = 'Primary';
  try {
    const result = await applyRules(
      mockExpense({ recipient: 'Unknown' }),
      { prisma: fakeDb([], { wallets: [{ id: WALLET_PRIMARY, name: 'Primary' }] }) }
    );
    assertEqual(result.walletId, WALLET_PRIMARY, 'Uses configured wallet name');
  } finally {
    if (previous === undefined) delete process.env.DEFAULT_WALLET_NAME;
    else process.env.DEFAULT_WALLET_NAME = previous;
  }
});

test('DEFAULT_WALLET_ID takes precedence over wallet name', async () => {
  const previous = process.env.DEFAULT_WALLET_ID;
  process.env.DEFAULT_WALLET_ID = WALLET_SAVINGS;
  try {
    const result = await applyRules(
      mockExpense({ recipient: 'Unknown' }),
      { prisma: fakeDb([], { wallets: [{ id: WALLET_PRIMARY, name: 'Primary' }, { id: WALLET_SAVINGS, name: 'Savings' }] }) }
    );
    assertEqual(result.walletId, WALLET_SAVINGS, 'Exact ID takes precedence');
  } finally {
    if (previous === undefined) delete process.env.DEFAULT_WALLET_ID;
    else process.env.DEFAULT_WALLET_ID = previous;
  }
});

test('Falls back to first wallet in database when env variables are not configured or do not match', async () => {
  const previousId = process.env.DEFAULT_WALLET_ID;
  const previousName = process.env.DEFAULT_WALLET_NAME;
  delete process.env.DEFAULT_WALLET_ID;
  delete process.env.DEFAULT_WALLET_NAME;
  try {
    const result = await applyRules(
      mockExpense({ recipient: 'Unknown' }),
      { prisma: fakeDb([], { wallets: [{ id: WALLET_PRIMARY, name: 'Some Other Wallet' }] }) }
    );
    assertEqual(result.walletId, WALLET_PRIMARY, 'Falls back to first wallet found in DB');
  } finally {
    if (previousId !== undefined) process.env.DEFAULT_WALLET_ID = previousId;
    if (previousName !== undefined) process.env.DEFAULT_WALLET_NAME = previousName;
  }
});

test('Skips soft-deleted wallet and falls back to active wallet', async () => {
  const previousId = process.env.DEFAULT_WALLET_ID;
  const previousName = process.env.DEFAULT_WALLET_NAME;
  delete process.env.DEFAULT_WALLET_ID;
  delete process.env.DEFAULT_WALLET_NAME;
  try {
    const db = fakeDb([], {
      wallets: [
        { id: 'deleted-w', name: 'Old Checking', isDeleted: true },
        { id: WALLET_SAVINGS, name: 'Active Wallet', isDeleted: false }
      ]
    });
    const result = await applyRules(
      mockExpense({ recipient: 'Unknown' }),
      { prisma: db }
    );
    assertEqual(result.walletId, WALLET_SAVINGS, 'Skips soft-deleted wallet in first active fallback');
  } finally {
    if (previousId !== undefined) process.env.DEFAULT_WALLET_ID = previousId;
    if (previousName !== undefined) process.env.DEFAULT_WALLET_NAME = previousName;
  }
});

test('Parser-declared wallet is skipped if soft-deleted', async () => {
  const previousId = process.env.DEFAULT_WALLET_ID;
  const previousName = process.env.DEFAULT_WALLET_NAME;
  delete process.env.DEFAULT_WALLET_ID;
  delete process.env.DEFAULT_WALLET_NAME;
  try {
    const db = fakeDb([], {
      wallets: [
        { id: 'deleted-santander', name: 'Santander', isDeleted: true },
        { id: WALLET_SAVINGS, name: 'Savings', isDeleted: false }
      ]
    });
    const result = await applyRules(
      mockTransfer({ walletName: 'Santander' }),
      { prisma: db }
    );
    assertEqual(result.walletId, WALLET_SAVINGS, 'Falls back to active wallet when parser wallet is soft-deleted');
  } finally {
    if (previousId !== undefined) process.env.DEFAULT_WALLET_ID = previousId;
    if (previousName !== undefined) process.env.DEFAULT_WALLET_NAME = previousName;
  }
});

// ----------------------------------------------------- Fault Tolerance

section('7. Fault Tolerance & Non-fatal Errors');

test('Database query error does not throw exception', async () => {
  const db = fakeDb([], { failOn: 'CBU' });
  const { result } = await withSilencedErrors(() =>
    applyRules(mockTransfer(), { prisma: db })
  );
  assertEqual(result.categoryId, null, 'Without DB returns null category without crashing');
  assertEqual(result.amount, 1500, 'Envelope amount preserved intact');
});

run();
