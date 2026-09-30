const { PrismaClient } = require('@prisma/client');

const GMAIL_SERVICE = 'gmail';
const HISTORY_KEY = 'lastHistoryId';
const IDS_KEY = 'processedIds';

const prisma = new PrismaClient();

// In-memory cache so we don't hit SQLite on every message
let state = null;

async function loadState() {
  if (state) return state;

  state = { ids: new Set(), lastHistoryId: null };

  try {
    // Load processed message IDs from SyncState
    const idsRecord = await prisma.syncState.findUnique({ where: { serviceName: `${GMAIL_SERVICE}:${IDS_KEY}` } });
    if (idsRecord) {
      try {
        const parsed = JSON.parse(idsRecord.lastSync);
        if (Array.isArray(parsed)) parsed.forEach((id) => state.ids.add(id));
      } catch { /* ignore malformed */ }
    }

    // Load last history ID from SyncState
    const histRecord = await prisma.syncState.findUnique({ where: { serviceName: `${GMAIL_SERVICE}:${HISTORY_KEY}` } });
    if (histRecord) {
      const n = Number(histRecord.lastSync);
      if (Number.isFinite(n) && n > 0) state.lastHistoryId = n;
    }
  } catch (e) {
    console.error('⚠️ [Dedup] Failed to load state from DB:', e.message);
  }

  // Seed from existing dumps as a fallback migration path
  const fs = require('fs');
  const path = require('path');
  const dumpDir = path.join(__dirname, '..', '..', 'dumps');
  if (fs.existsSync(dumpDir)) {
    for (const file of fs.readdirSync(dumpDir)) {
      if (file.endsWith('.txt')) state.ids.add(file.slice(0, -4));
    }
  }

  console.log(`♻️ [Dedup] ${state.ids.size} message ID(s) already processed.`);
  return state;
}

async function persistIds() {
  try {
    await loadState();
    await prisma.syncState.upsert({
      where: { serviceName: `${GMAIL_SERVICE}:${IDS_KEY}` },
      update: { lastSync: JSON.stringify([...state.ids]) },
      create: { serviceName: `${GMAIL_SERVICE}:${IDS_KEY}`, lastSync: JSON.stringify([...state.ids]) },
    });
  } catch (e) {
    console.error('⚠️ [Dedup] Failed to persist processed IDs:', e.message);
  }
}

async function persistHistoryId() {
  try {
    await loadState();
    await prisma.syncState.upsert({
      where: { serviceName: `${GMAIL_SERVICE}:${HISTORY_KEY}` },
      update: { lastSync: String(state.lastHistoryId) },
      create: { serviceName: `${GMAIL_SERVICE}:${HISTORY_KEY}`, lastSync: String(state.lastHistoryId) },
    });
  } catch (e) {
    console.error('⚠️ [Dedup] Failed to persist history ID:', e.message);
  }
}

async function isProcessed(id) {
  return (await loadState()).ids.has(id);
}

async function markProcessed(id) {
  (await loadState()).ids.add(id);
  await persistIds();
}

async function getLastHistoryId() {
  return (await loadState()).lastHistoryId;
}

async function setLastHistoryId(id) {
  if (typeof id === 'number' && id > 0) {
    (await loadState()).lastHistoryId = id;
    await persistHistoryId();
  }
}

module.exports = { isProcessed, markProcessed, getLastHistoryId, setLastHistoryId };