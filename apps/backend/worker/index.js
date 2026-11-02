const { startGmailListener, catchUp } = require('./gmail/listener');
const { renewWatchWithRetry } = require('./gmail/watch');
const { logEvent } = require('./gmail/logger');

// 24 hours interval for Gmail watch renewal (Google watch lasts 7 days max)
const GMAIL_RENEW_INTERVAL_MS = 24 * 60 * 60 * 1000;
// Fallback retry delay if all immediate renewal attempts fail
const RENEWAL_FAILURE_RETRY_MS = 15 * 60 * 1000;

let renewalTimer = null;

async function runRenewalCycle() {
  try {
    await renewWatchWithRetry({ maxRetries: 10, initialDelayMs: 5000 });
    
    // Catch-up on any emails received while watch might have been down/expired
    try {
      await catchUp();
    } catch (catchUpErr) {
      console.error('🔴 [Gmail] Catch-up error:', catchUpErr.message);
      await logEvent('error', `Catch-up error: ${catchUpErr.message}`);
    }

    console.log(`⏱️ Next Gmail watch renewal scheduled in 24 hours.`);
    renewalTimer = setTimeout(runRenewalCycle, GMAIL_RENEW_INTERVAL_MS);
  } catch (error) {
    console.error(`🔴 [Gmail Watch] Renewal cycle failed after retries: ${error.message}. Scheduling retry in 15m.`);
    renewalTimer = setTimeout(runRenewalCycle, RENEWAL_FAILURE_RETRY_MS);
  }
}

async function bootstrapWorker() {
  console.log('🚀 Starting Background Ingestion Worker Service...');

  // 1. Launch the Cloud Pub/Sub listener immediately
  await startGmailListener();

  // 2. Renew Gmail watch subscription with retry backoff, then run initial catch-up and schedule periodic renewal
  runRenewalCycle();

  console.log('✅ Worker Service started successfully. Running in background.');
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  if (renewalTimer) clearTimeout(renewalTimer);
});
process.on('SIGINT', () => {
  if (renewalTimer) clearTimeout(renewalTimer);
});

// Start orchestrator
bootstrapWorker();
