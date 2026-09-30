const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { routeSource } = require('./sources');
const { applyRules } = require('./rules/rules');
const { getEmailBody, getEmailBodyHtml } = require('./gmail/parser');
const { createTransactionWithBalance } = require('../src/lib/transactionOperations');

function headerValue(headers, name) {
  const h = headers.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
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

async function simulate() {
  const args = process.argv.slice(2);
  const saveToDb = args.includes('--save');
  const emlFile = args.find((a) => !a.startsWith('--'))
    || path.resolve(__dirname, '../dumps/Tu viaje del sábado por la mañana con Uber.eml');

  if (!fs.existsSync(emlFile)) {
    console.error(`🔴 EML file not found: ${emlFile}`);
    process.exit(1);
  }

  console.log(`\n📨 Simulating incoming email from: ${path.basename(emlFile)}`);
  console.log(`Mode: ${saveToDb ? '💾 LIVE (saving to database)' : '🔍 DRY-RUN (preview only, use --save to commit)'}\n`);

  const prisma = new PrismaClient();
  const eml = readEml(emlFile);
  const payload = emlToGmailPayload(eml);

  const from = headerValue(eml.headers, 'From');
  const subject = headerValue(eml.headers, 'Subject');

  const source = routeSource({ from, subject, headers: eml.headers });
  if (!source) {
    console.log(`🔴 No parser matched this email sender: "${from}"`);
    await prisma.$disconnect();
    return;
  }

  console.log(`🔌 Matched Parser: "${source.id}"`);
  console.log(`   From: ${from}`);
  console.log(`   Subject: ${subject}`);

  const envelope = source.parse({
    messageId: `simulated-${Date.now()}`,
    headers: eml.headers,
    subject,
    text: getEmailBody(payload),
    rawHtml: getEmailBodyHtml(payload)
  });

  if (!envelope || !envelope.matched) {
    console.log(`⚠️ Parser ignored this email (not a financial transaction).`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\n📋 Parsed Envelope:`);
  console.log(`   Amount:       $${envelope.amount}`);
  console.log(`   Description:  ${envelope.description}`);
  console.log(`   Date:         ${envelope.occurredAt}`);

  const finalData = await applyRules(envelope, { from, prisma });

  let categoryName = 'None';
  if (finalData.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: finalData.categoryId } });
    categoryName = cat ? `${cat.name} (${cat.group})` : finalData.categoryId;
  }

  let walletName = 'None';
  if (finalData.walletId) {
    const wal = await prisma.wallet.findUnique({ where: { id: finalData.walletId } });
    walletName = wal ? wal.name : finalData.walletId;
  }

  console.log(`\n🎯 Rules Resolution:`);
  console.log(`   Category:     ${categoryName}`);
  console.log(`   Wallet:       ${walletName}`);
  console.log(`   Is Transfer:  ${finalData.isInternalTransfer}`);

  if (saveToDb) {
    if (!finalData.walletId) {
      console.log(`🔴 Cannot save: No wallet resolved.`);
    } else {
      const tx = await createTransactionWithBalance(prisma, {
        amount: finalData.amount,
        date: finalData.occurredAt || new Date().toISOString(),
        description: finalData.description,
        categoryId: finalData.categoryId,
        walletId: finalData.walletId,
        toWalletId: finalData.toWalletId,
        isInternalTransfer: finalData.isInternalTransfer,
      });
      await prisma.workerLog.create({
        data: {
          level: 'success',
          message: `[Simulated] Transaction created: ${finalData.description} for $${finalData.amount} -> ${walletName} (${categoryName})`
        }
      });
      console.log(`\n✅ Transaction SAVED to database! ID: ${tx.id}`);
      console.log(`Check your frontend (Transactions & Live Feed) to see it.`);
    }
  }

  await prisma.$disconnect();
}

simulate().catch((err) => {
  console.error('🔴 Error simulating email:', err);
  process.exit(1);
});
