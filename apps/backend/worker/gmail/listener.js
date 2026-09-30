const { PubSub } = require('@google-cloud/pubsub');
const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');
const { getEmailBody, getEmailBodyHtml } = require('./parser');
const { routeSource, routingHeaders } = require('../sources');
const { applyRules } = require('../rules/rules');
const { dumpEmailToFile } = require('./dump');
const { isProcessed, markProcessed, getLastHistoryId, setLastHistoryId } = require('./processed');
const { createTransactionWithBalance } = require('../../src/lib/transactionOperations');

const prisma = new PrismaClient();

async function logEvent(level, message, metadata = null) {
  console.log(`[${level.toUpperCase()}] ${message}`);
  try {
    await prisma.workerLog.create({
      data: {
        level,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (e) {
    console.error('Error saving worker log:', e.message);
  }
}

const pubSubClient = new PubSub({
  projectId: process.env.GOOGLE_PROJECT_ID
});
const subscriptionName = process.env.GOOGLE_PUBSUB_SUBSCRIPTION;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Default description for transfers between user's own accounts
const INTERNAL_TRANSFER_DESCRIPTION = 'Internal Transfer';

// Process a single email: route + dump + parse + transaction creation
async function processMessage(messageId) {
  // Fetch metadata first to perform fast pre-filtering without downloading body
  const metaMessage = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: routingHeaders()
  });

  const metaHeaders = (metaMessage.data.payload && metaMessage.data.payload.headers) || [];
  const findHeader = (name) => {
    const found = metaHeaders.find((h) => h.name && h.name.toLowerCase() === name.toLowerCase());
    return found ? found.value : '';
  };

  // Fast pre-filter: skip email if no source is registered for this sender
  const fromHeader = findHeader('From');
  const source = routeSource(fromHeader);

  if (!source) {
    await logEvent('skip', `ID: ${messageId} - Skipped: No registered parser for sender (${fromHeader}).`);
    await markProcessed(messageId);
    return;
  }

  // Download full message for parser and dump
  const fullMessage = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });

  await logEvent('info', `Processing email: ${messageId} | source=${source.id}`);

  // Save raw dump for reference/debugging
  dumpEmailToFile(fullMessage.data);

  const envelope = source.parse({
    messageId,
    headers: (fullMessage.data.payload && fullMessage.data.payload.headers) || [],
    subject: findHeader('Subject'),
    text: getEmailBody(fullMessage.data.payload),
    rawHtml: getEmailBodyHtml(fullMessage.data.payload)
  });

  // If parser rejected the email (e.g. promo, statement, non-receipt), skip it
  if (!envelope || !envelope.matched || !(envelope.amount > 0)) {
    await logEvent('skip', `ID: ${messageId} | source=${source.id} - Ignored: Not a financial transaction.`);
    await markProcessed(messageId);
    return;
  }

  const finalData = await applyRules(envelope, { from: fromHeader });

  // Wallet is required by DB schema: if no wallets exist at all, skip until one is created
  if (!finalData.walletId) {
    await logEvent(
      'error',
      `ID: ${messageId} | source=${source.id} - No wallets exist in database. ` +
      `Transaction skipped. Create at least one wallet in the UI or database.`
    );
    return;
  }

  const finalDescription = finalData.customDescription
    || (finalData.isInternalTransfer ? INTERNAL_TRANSFER_DESCRIPTION : finalData.description);

  const date = finalData.occurredAt || new Date().toISOString();

  try {
    await createTransactionWithBalance(prisma, {
      amount: finalData.amount,
      date,
      description: finalDescription,
      categoryId: finalData.categoryId,
      walletId: finalData.walletId,
      toWalletId: finalData.toWalletId,
      isInternalTransfer: finalData.isInternalTransfer,
    });
    await markProcessed(messageId);
    console.log(`🔴 [Gmail] Transaction saved: ${finalDescription} for $${finalData.amount}`);
  } catch (dbError) {
    await logEvent('error', `Prisma Error: ${dbError.message}`);
  }
}

// Initial scan: scans the full label once on cold boot
async function processLabel() {
  const res = await gmail.users.messages.list({
    userId: 'me',
    labelIds: [process.env.GOOGLE_LABEL_ID],
    maxResults: 100
  });

  const messages = res.data.messages || [];
  console.log(`🔴 [Gmail] Label scan: ${messages.length} message(s) found in label.`);

  for (const msg of messages) {
    if (await isProcessed(msg.id)) {
      console.log(`⏭️ [Gmail] Already processed ${msg.id} (skip)`);
      continue;
    }
    try {
      await processMessage(msg.id);
    } catch (e) {
      await logEvent('error', `Error in ${msg.id}: ${e.message}`);
    }
  }
}

// Incremental scan: processes only events added since last historyId
async function processHistory(startHistoryId) {
  const ids = new Set();
  let pageToken;

  do {
    const res = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      pageToken,
      historyTypes: ['messageAdded', 'labelAdded']
    });
    const history = res.data.history || [];
    for (const entry of history) {
      for (const m of entry.messagesAdded || []) {
        if (m.message && m.message.id) ids.add(m.message.id);
      }
      for (const l of entry.labelsAdded || []) {
        for (const mid of l.messageIds || []) ids.add(mid);
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  console.log(`🔴 [Gmail] History ${startHistoryId}: ${ids.size} new message(s).`);

  for (const messageId of ids) {
    if (await isProcessed(messageId)) {
      console.log(`⏭️ [Gmail] Already processed ${messageId} (skip)`);
      continue;
    }
    try {
      await processMessage(messageId);
    } catch (e) {
      await logEvent('error', `Error in ${messageId}: ${e.message}`);
    }
  }

  return ids;
}

// Anchors current profile historyId after full scan
async function anchorCurrentHistoryId() {
  try {
    const prof = await gmail.users.getProfile({ userId: 'me' });
    const historyId = Number(prof.data.historyId);
    if (Number.isFinite(historyId) && historyId > 0) await setLastHistoryId(historyId);
    console.log(`🔴 [Gmail] Anchored historyId: ${historyId}`);
  } catch (e) {
    console.error('🔴 [Gmail] Failed to retrieve historyId:', e.message);
  }
}

async function processNewMail(notificationHistoryId) {
  const lastHistoryId = await getLastHistoryId();

  if (lastHistoryId) {
    try {
      await processHistory(lastHistoryId);
    } catch (e) {
      // Fallback to full label scan if history is invalid or expired (>7 days)
      console.error('🔴 [Gmail] Invalid history ID, falling back to label scan:', e.message);
      await processLabel();
      await anchorCurrentHistoryId();
    }
  } else {
    console.log('🔴 [Gmail] No previous historyId found: running initial label scan.');
    await processLabel();
    await anchorCurrentHistoryId();
  }

  const notifId = Number(notificationHistoryId);
  if (Number.isFinite(notifId)) {
    const current = await getLastHistoryId();
    await setLastHistoryId(Math.max(current || 0, notifId));
  }
}

async function startGmailListener() {
  const subscription = pubSubClient.subscription(subscriptionName);
  console.log(`🔴 [Gmail] Listening for push messages on subscription "${subscriptionName}"...`);

  let queue = Promise.resolve();

  const messageHandler = (message) => {
    queue = queue.then(async () => {
      try {
        const data = JSON.parse(message.data.toString());
        await logEvent('info', `Push notification received - History ID: ${data.historyId}`);

        await processNewMail(data.historyId);

        message.ack();
      } catch (error) {
        await logEvent('error', `Error in Pub/Sub message handler: ${error.message || error}`);
        message.nack();
      }
    });
  };

  subscription.on('message', messageHandler);

  subscription.on('error', (error) => {
    console.error('🔴 [Gmail] Fatal error on Pub/Sub subscription:', error);
  });

  // Catch-up on startup
  try {
    await processNewMail(null);
  } catch (error) {
    console.error('🔴 [Gmail] Catch-up error on startup:', error);
  }
}

module.exports = { startGmailListener };