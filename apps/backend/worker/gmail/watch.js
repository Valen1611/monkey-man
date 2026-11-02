const { google } = require('googleapis');
const { logEvent } = require('./logger');
const { setWatchExpiration, getWatchExpiration } = require('./processed');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({ 
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN 
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

async function renewWatch() {
  try {
    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: [process.env.GOOGLE_LABEL_ID], 
        labelFilterAction: 'include',
        topicName: process.env.GOOGLE_TOPIC_NAME 
      }
    });

    const expiration = parseInt(res.data.expiration, 10);
    const expirationDate = new Date(expiration).toLocaleString();
    console.log('🔴 [Gmail Watch] Subscription renewed.');
    console.log(`🔴 [Gmail Watch] Expires at: ${expirationDate}`);
    await logEvent('info', `[Gmail Watch] Subscription renewed successfully. Expires at: ${expirationDate}`, {
      expiration,
      historyId: res.data.historyId
    });

    if (Number.isFinite(expiration)) {
      await setWatchExpiration(expiration);
    }

    return res.data;
  } catch (error) {
    console.error('🔴 [Gmail Watch] Renewal error:', error.message);
    await logEvent('error', `[Gmail Watch] Renewal error: ${error.message}`);
    throw error;
  }
}

async function renewWatchWithRetry({
  maxRetries = 10,
  initialDelayMs = 5000,
  maxDelayMs = 300000,
  renewFn = renewWatch,
  sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
} = {}) {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await renewFn();
      return data;
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      console.log(`🔴 [Gmail Watch] Retrying renewal in ${Math.round(delay / 1000)}s (attempt ${attempt}/${maxRetries})...`);
      await sleepFn(delay);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }
}

module.exports = {
  renewWatch,
  renewWatchWithRetry,
  getWatchExpiration
};
