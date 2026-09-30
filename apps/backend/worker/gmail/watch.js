const { google } = require('googleapis');

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
    console.log('🔴 [Gmail Watch] Subscription renewed.');
    console.log(`🔴 [Gmail Watch] Expires at: ${new Date(parseInt(res.data.expiration)).toLocaleString()}`);
  } catch (error) {
    console.error('🔴 [Gmail Watch] Renewal error:', error.message);
  }
}

module.exports = { renewWatch };
