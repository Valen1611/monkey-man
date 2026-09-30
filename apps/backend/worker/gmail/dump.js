const fs = require('fs');
const path = require('path');
const { getEmailBody } = require('./parser');

const DUMP_DIR = path.join(__dirname, '..', '..', 'dumps');

function ensureDumpDir() {
  if (!fs.existsSync(DUMP_DIR)) {
    // 0o777 so files written by the root container stay readable/deletable from the host
    fs.mkdirSync(DUMP_DIR, { recursive: true, mode: 0o777 });
  }
}

function getHeader(headers, name) {
  if (!Array.isArray(headers)) return '';
  const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found ? found.value : '';
}

/**
 * Saves the raw content of an incoming email to a .txt file inside `dumps/`,
 * one file per email (keyed by Gmail message id, no overwrites).
 * Returns the file path, or null on failure.
 */
function dumpEmailToFile(message) {
  try {
    ensureDumpDir();

    const messageId = message && message.id ? message.id : 'unknown';
    const filePath = path.join(DUMP_DIR, `${messageId}.txt`);

    // One file per email: skip if already dumped (Pub/Sub may redeliver).
    if (fs.existsSync(filePath)) {
      console.log(`📄 [Dump] Already exists: ${filePath} (skip)`);
      return filePath;
    }

    const headers = message.payload && message.payload.headers ? message.payload.headers : [];
    const body = getEmailBody(message.payload);

    const content = [
      '========================================================',
      `Message-ID: ${getHeader(headers, 'Message-ID')}`,
      `Gmail ID: ${messageId}`,
      `Date: ${getHeader(headers, 'Date')}`,
      `From: ${getHeader(headers, 'From')}`,
      `Subject: ${getHeader(headers, 'Subject')}`,
      '========================================================',
      body,
      '',
    ].join('\n');

    fs.writeFileSync(filePath, content, { encoding: 'utf-8', mode: 0o666 });
    console.log(`📄 [Dump] Email saved: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('📄 [Dump] Error saving email:', error.message);
    return null;
  }
}

module.exports = { dumpEmailToFile, DUMP_DIR };