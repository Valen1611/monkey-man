const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { createTransactionWithBalance } = require(path.join(__dirname, '../src/lib/transactionOperations.js'));

const prisma = new PrismaClient();
const MOCK_TAG = '[Mock]';

async function getContext() {
  const wallets = await prisma.wallet.findMany({
    where: { isDeleted: false },
    orderBy: { balance: 'desc' }
  });

  if (wallets.length === 0) {
    throw new Error('No active wallets found. Create at least one wallet first.');
  }

  const primaryWallet = wallets.find(w => w.name.toLowerCase().includes('mercado')) || wallets[0];
  const secondaryWallet = wallets.find(w => w.id !== primaryWallet.id) || primaryWallet;

  const categories = await prisma.category.findMany();
  const getCat = (group, fallbackName) => {
    return categories.find(c => c.group === group && (!fallbackName || c.name.toLowerCase().includes(fallbackName.toLowerCase())))
      || categories.find(c => c.group === group)
      || null;
  };

  return {
    wallets,
    primaryWallet,
    secondaryWallet,
    incomeCat: getCat('INCOME', 'sueldo') || getCat('INCOME'),
    sideIncomeCat: getCat('INCOME', 'plata') || getCat('INCOME'),
    fixedCat: getCat('FIXED', 'monotributo') || getCat('FIXED'),
    varTransportCat: getCat('VARIABLE', 'transporte') || getCat('VARIABLE'),
    varOutingCat: getCat('VARIABLE', 'salidas') || getCat('VARIABLE'),
    savingsCat: getCat('SAVINGS')
  };
}

async function seedMockData() {
  console.log('🚀 [Mock Data] Generating realistic transactions across the last 6 months...');
  const ctx = await getContext();

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: String(d.getMonth() + 1).padStart(2, '0')
    });
  }

  let count = 0;

  for (const { year, month } of months) {
    const isCurrent = (year === now.getFullYear() && month === String(now.getMonth() + 1).padStart(2, '0'));
    // Generate dates within month
    const makeDate = (day, hour = 12, min = 30) => {
      // If current month, don't create future dates
      const cappedDay = isCurrent ? Math.min(day, Math.max(now.getDate(), 1)) : day;
      const dStr = `${year}-${month}-${String(cappedDay).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00.000Z`;
      return dStr;
    };

    const templates = [
      // 1. Income (Salary)
      ctx.incomeCat && {
        amount: 850000,
        date: makeDate(1, 10, 15),
        description: `${MOCK_TAG} Sueldo Mensual`,
        categoryId: ctx.incomeCat.id,
        walletId: ctx.primaryWallet.id,
      },
      // 2. Freelance / Extra
      ctx.sideIncomeCat && {
        amount: 85000,
        date: makeDate(16, 17, 45),
        description: `${MOCK_TAG} Cobro Freelance / Extra`,
        categoryId: ctx.sideIncomeCat.id,
        walletId: ctx.primaryWallet.id,
      },
      // 3. Fixed: Monotributo
      ctx.fixedCat && {
        amount: 58000,
        date: makeDate(5, 11, 20),
        description: `${MOCK_TAG} Monotributo AFIP`,
        categoryId: ctx.fixedCat.id,
        walletId: ctx.primaryWallet.id,
      },
      // 4. Fixed: Internet / Services
      ctx.fixedCat && {
        amount: 24500,
        date: makeDate(8, 14, 0),
        description: `${MOCK_TAG} Internet Personal Flow`,
        categoryId: ctx.fixedCat.id,
        walletId: ctx.primaryWallet.id,
      },
      // 5. Savings Transfer
      ctx.savingsCat && {
        amount: 180000,
        date: makeDate(10, 12, 0),
        description: `${MOCK_TAG} Ahorro Inversión FCI`,
        categoryId: ctx.savingsCat.id,
        walletId: ctx.primaryWallet.id,
      },
      // 6. Variable: Supermercado
      ctx.varOutingCat && {
        amount: 48500,
        date: makeDate(7, 19, 10),
        description: `${MOCK_TAG} Supermercado Coto`,
        categoryId: ctx.varOutingCat.id,
        walletId: ctx.primaryWallet.id,
      },
      // 7. Variable: Uber / Transporte
      ctx.varTransportCat && {
        amount: 6800,
        date: makeDate(11, 8, 30),
        description: `${MOCK_TAG} Uber — Viaje a oficina`,
        categoryId: ctx.varTransportCat.id,
        walletId: ctx.primaryWallet.id,
      },
      // 8. Variable: Cena / Bar
      ctx.varOutingCat && {
        amount: 32000,
        date: makeDate(18, 22, 15),
        description: `${MOCK_TAG} Cena Parrilla Don Julio`,
        categoryId: ctx.varOutingCat.id,
        walletId: ctx.secondaryWallet.id,
      },
      // 9. Variable: Uber regreso
      ctx.varTransportCat && {
        amount: 7400,
        date: makeDate(23, 23, 40),
        description: `${MOCK_TAG} Uber — Retorno a casa`,
        categoryId: ctx.varTransportCat.id,
        walletId: ctx.primaryWallet.id,
      }
    ].filter(Boolean);

    for (const item of templates) {
      await createTransactionWithBalance(prisma, item);
      count++;
    }
  }

  console.log(`✅ [Mock Data] Successfully inserted ${count} transactions across 6 months.`);
  await printSummary();
}

async function clearMockData(clearAll = false) {
  console.log(clearAll 
    ? '⚠️ [Mock Data] Clearing ALL transactions and resetting balances...' 
    : '🧹 [Mock Data] Removing all [Mock] transactions...');

  const whereClause = clearAll 
    ? {} 
    : { description: { startsWith: MOCK_TAG } };

  const toDelete = await prisma.transaction.findMany({
    where: whereClause,
    select: { id: true }
  });

  const { count } = await prisma.transaction.deleteMany({
    where: whereClause
  });

  console.log(`🗑️ Deleted ${count} transaction(s).`);

  // Recalculate all active wallet balances from scratch based on remaining transactions
  console.log('🔄 Reconciling wallet balances from remaining transactions...');
  const wallets = await prisma.wallet.findMany();

  for (const wallet of wallets) {
    const txs = await prisma.transaction.findMany({
      where: {
        OR: [
          { walletId: wallet.id },
          { toWalletId: wallet.id }
        ]
      },
      include: { category: true }
    });

    let newBalance = 0;
    for (const t of txs) {
      const isInternal = Boolean(t.toWalletId);
      const isIncome = t.category && t.category.group === 'INCOME';

      if (isInternal) {
        if (t.walletId === wallet.id) newBalance -= t.amount;
        if (t.toWalletId === wallet.id) newBalance += t.amount;
      } else if (isIncome) {
        newBalance += t.amount;
      } else {
        newBalance -= t.amount;
      }
    }

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance }
    });

    console.log(`  ✓ Wallet "${wallet.name}": reconciled balance = $${newBalance}`);
  }

  console.log('✅ Reconciliation complete.');
}

async function printSummary() {
  const totalTxs = await prisma.transaction.count();
  const mockTxs = await prisma.transaction.count({
    where: { description: { startsWith: MOCK_TAG } }
  });
  const wallets = await prisma.wallet.findMany({ where: { isDeleted: false } });

  console.log('\n📊 Database Status:');
  console.log(`  • Total Transactions: ${totalTxs} (${mockTxs} mock)`);
  console.log('  • Active Wallets:');
  for (const w of wallets) {
    console.log(`      - ${w.name}: $${w.balance.toLocaleString('es-AR')}`);
  }
}

async function main() {
  const cmd = process.argv[2] || 'seed';

  if (cmd === 'seed') {
    await seedMockData();
  } else if (cmd === 'clear') {
    const clearAll = process.argv.includes('--all');
    await clearMockData(clearAll);
  } else if (cmd === 'status') {
    await printSummary();
  } else {
    console.log(`Unknown command: "${cmd}". Available commands:`);
    console.log('  node prisma/mock-transactions.js seed       # Seeds 6 months of sample transactions');
    console.log('  node prisma/mock-transactions.js clear      # Removes only [Mock] transactions');
    console.log('  node prisma/mock-transactions.js clear --all # Removes ALL transactions');
    console.log('  node prisma/mock-transactions.js status     # Shows summary');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error executing mock transactions script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
