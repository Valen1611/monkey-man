const { PrismaClient } = require('@prisma/client');
const {
  normalizeKeyValue,
  extractEmailAddress
} = require('../../src/lib/ruleKeyTypes');

const prisma = new PrismaClient();

/**
 * Routes a normalized ENVELOPE (see sources/envelope.js) against rules
 * stored in the `ParserRule` database table.
 */

/**
 * Looks up a rule by (keyType, keyValue) using the composite UNIQUE index.
 */
async function findRule(db, keyType, value) {
  const keyValue = normalizeKeyValue(keyType, value);
  if (!keyValue) return null;
  return db.parserRule.findUnique({
    where: { keyType_keyValue: { keyType, keyValue } }
  });
}

/** Fault-tolerant lookup: returns null instead of throwing on database error. */
async function lookupRule(db, keyType, value, log) {
  try {
    return await findRule(db, keyType, value);
  } catch (dbError) {
    console.error(`🔴 Error querying ParserRule (${keyType}):`, dbError.message || dbError);
    if (log) {
      log(`Error querying rule ${keyType}: ${dbError.message || dbError}`);
    }
    return null;
  }
}

/**
 * Resolves the fallback default wallet.
 * Resolution precedence: `DEFAULT_WALLET_ID` (exact ID) > `DEFAULT_WALLET_NAME` > "Checking Account" > first DB wallet.
 */
async function resolveDefaultWallet(db, log) {
  if (!db || !db.wallet) return null;

  const byId = process.env.DEFAULT_WALLET_ID;
  if (byId) {
    const w = await db.wallet.findUnique({ where: { id: byId } });
    if (w && !w.isDeleted) return w.id;
    if (log) log(`⚠️ DEFAULT_WALLET_ID=${byId} not found or deleted in database; falling back to default wallet name.`);
  }

  const name = process.env.DEFAULT_WALLET_NAME || 'Checking Account';
  const byName = await db.wallet.findUnique({ where: { name } });
  if (byName && !byName.isDeleted) return byName.id;

  // Fallback: pick the first active wallet available in the database
  if (typeof db.wallet.findFirst === 'function') {
    const firstWallet = await db.wallet.findFirst({ where: { isDeleted: false } });
    if (firstWallet) return firstWallet.id;
  }

  if (log) {
    log(`🔴 No wallets found in database. Create at least one wallet.`);
  }
  return null;
}

/**
 * Applies database-driven rules to an envelope.
 * Resolves categoryId, walletId, isInternalTransfer, and toWalletId.
 */
async function applyRules(envelope, options = {}) {
  const db = options.prisma || prisma;
  const log = typeof options.log === 'function' ? options.log : null;

  const cbuDestino = envelope.cbuDestino || null;
  const fromAddress = extractEmailAddress(options.from || (envelope.extra && envelope.extra.from) || null);

  const result = {
    ...envelope,
    categoryId: null,
    walletId: null,
    isInternalTransfer: false,
    toWalletId: null
  };

  // 1. Look up rules in the database dictionary: CBU (for transfers) & FROM (for receipts)
  const cbuRule = cbuDestino ? await lookupRule(db, 'CBU', cbuDestino, log) : null;

  let fromRule = fromAddress ? await lookupRule(db, 'FROM', fromAddress, log) : null;
  if (!fromRule && fromAddress && fromAddress.includes('@')) {
    const domain = fromAddress.slice(fromAddress.lastIndexOf('@') + 1);
    fromRule = await lookupRule(db, 'FROM', domain, log);
  }

  // ------------------------------------------------ Category Resolution
  // Dictionary lookup: CBU takes precedence over FROM
  if (cbuRule && cbuRule.categoryId) {
    result.categoryId = cbuRule.categoryId;
  } else if (fromRule && fromRule.categoryId) {
    result.categoryId = fromRule.categoryId;
  }

  // ------------------------------------------------ Wallet Resolution
  // 1. Parser-declared wallet name (e.g. Santander parser sets envelope.walletName = 'Santander')
  if (envelope.walletName && db && db.wallet) {
    try {
      const parserWallet = await db.wallet.findUnique({ where: { name: envelope.walletName } });
      if (parserWallet && !parserWallet.isDeleted) {
        result.walletId = parserWallet.id;
      }
    } catch (err) {
      if (log) log(`Error resolving parser wallet "${envelope.walletName}": ${err.message || err}`);
    }
  }

  // 2. FROM rule wallet (e.g. uber.com -> MercadoPago)
  if (!result.walletId && fromRule && fromRule.walletId) {
    result.walletId = fromRule.walletId;
  }

  // 3. Default fallback wallet
  if (!result.walletId) {
    result.walletId = await resolveDefaultWallet(db, log);
  }

  // ------------------------------------------------ Internal Transfer Detection
  if (cbuRule && cbuRule.isMine) {
    result.isInternalTransfer = true;
    result.toWalletId = cbuRule.walletId || null;
  } else if (fromRule && fromRule.isMine) {
    result.isInternalTransfer = true;
    result.toWalletId = result.walletId;
    result.walletId = fromRule.walletId || null;
  }

  return result;
}

module.exports = { applyRules, findRule };
