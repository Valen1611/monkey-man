#!/usr/bin/env node
/**
 * Unit tests for Gmail Watch renewal and exponential backoff retry logic.
 * Run directly with: `node worker/gmail/__tests__/watch.test.js`.
 */

const { renewWatchWithRetry } = require('../watch');
const { setWatchExpiration, getWatchExpiration } = require('../processed');

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

section('1. Watch Renewal Exponential Backoff & Retry');

test('renewWatchWithRetry succeeds on first attempt', async () => {
  let callCount = 0;
  const mockRenew = async () => {
    callCount++;
    return { expiration: '1234567890' };
  };

  const delays = [];
  const mockSleep = async (ms) => { delays.push(ms); };

  const result = await renewWatchWithRetry({
    maxRetries: 3,
    initialDelayMs: 100,
    renewFn: mockRenew,
    sleepFn: mockSleep
  });

  assertEqual(result.expiration, '1234567890', 'Must return renew result');
  assertEqual(callCount, 1, 'Must call renewFn exactly once');
  assertEqual(delays.length, 0, 'Must not sleep if first attempt succeeds');
});

test('renewWatchWithRetry retries on failure and recovers with backoff', async () => {
  let callCount = 0;
  const mockRenew = async () => {
    callCount++;
    if (callCount < 3) {
      throw new Error('EAI_AGAIN oauth2.googleapis.com');
    }
    return { expiration: '9876543210' };
  };

  const delays = [];
  const mockSleep = async (ms) => { delays.push(ms); };

  const result = await renewWatchWithRetry({
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    renewFn: mockRenew,
    sleepFn: mockSleep
  });

  assertEqual(result.expiration, '9876543210', 'Must recover and return result');
  assertEqual(callCount, 3, 'Must have attempted 3 times');
  assertEqual(delays.length, 2, 'Must have slept twice');
  assertEqual(delays[0], 1000, 'First backoff delay is initialDelayMs');
  assertEqual(delays[1], 2000, 'Second backoff delay is doubled');
});

test('renewWatchWithRetry throws if all retries are exhausted', async () => {
  let callCount = 0;
  const mockRenew = async () => {
    callCount++;
    throw new Error('Permanent network error');
  };

  const delays = [];
  const mockSleep = async (ms) => { delays.push(ms); };

  let thrown = null;
  try {
    await renewWatchWithRetry({
      maxRetries: 3,
      initialDelayMs: 500,
      renewFn: mockRenew,
      sleepFn: mockSleep
    });
  } catch (err) {
    thrown = err;
  }

  assert(thrown !== null, 'Must throw after exhausting retries');
  assertEqual(thrown.message, 'Permanent network error', 'Preserves original error message');
  assertEqual(callCount, 3, 'Exhausts exactly maxRetries');
  assertEqual(delays.length, 2, 'Sleeps maxRetries - 1 times');
});

section('2. Watch Expiration Persistence');

test('setWatchExpiration and getWatchExpiration persist timestamp in SyncState', async () => {
  const testExp = 1793750000000;
  await setWatchExpiration(testExp);
  const loaded = await getWatchExpiration();
  assertEqual(loaded, testExp, 'Must accurately persist and retrieve expiration timestamp');
});

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

  console.log(`\n================================================================`);
  if (failures.length === 0) {
    console.log(`  \x1b[32mPASS\x1b[0m  ${passed}/${tests.length} tests OK`);
  } else {
    console.log(`  \x1b[31mFAIL\x1b[0m  ${failures.length} failed, ${passed} passed`);
  }
  console.log(`================================================================\n`);

  if (failures.length > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
