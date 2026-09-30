const { startGmailListener } = require('./gmail/listener');
const { renewWatch } = require('./gmail/watch');

// 24 hours interval for Gmail watch renewal
const GMAIL_RENEW_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function bootstrapWorker() {
  console.log('🚀 Starting Background Ingestion Worker Service...');

  // 1. Launch the Cloud Pub/Sub listener immediately
  startGmailListener();

  // 2. Renew the Gmail watch subscription immediately on boot, then every 24h
  await renewWatch();
  setInterval(() => {
    renewWatch();
  }, GMAIL_RENEW_INTERVAL_MS);

  console.log('✅ Worker Service started successfully. Running in background.');
}

// Start orchestrator
bootstrapWorker();
