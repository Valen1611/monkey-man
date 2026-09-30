const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_WALLETS = [
  { name: 'Checking Account', balance: 0, color: '#3b82f6' },
  { name: 'Savings Account', balance: 0, color: '#10b981' },
  { name: 'Cash', balance: 0, color: '#f59e0b' },
  { name: 'Digital Wallet', balance: 0, color: '#8b5cf6' },
];

const DEFAULT_CATEGORIES = [
  // Income
  { name: 'Salary', color: '#22c55e', group: 'INCOME' },
  { name: 'Freelance & Side Income', color: '#10b981', group: 'INCOME' },
  { name: 'Investments & Dividends', color: '#06b6d4', group: 'INCOME' },

  // Fixed Expenses
  { name: 'Rent & Housing', color: '#ef4444', group: 'FIXED' },
  { name: 'Utilities & Bills', color: '#3b82f6', group: 'FIXED' },
  { name: 'Subscriptions', color: '#6366f1', group: 'FIXED' },

  // Variable Expenses
  { name: 'Food & Groceries', color: '#f97316', group: 'VARIABLE' },
  { name: 'Dining Out', color: '#fb923c', group: 'VARIABLE' },
  { name: 'Transportation', color: '#eab308', group: 'VARIABLE' },
  { name: 'Shopping', color: '#ec4899', group: 'VARIABLE' },
  { name: 'Entertainment', color: '#a855f7', group: 'VARIABLE' },
  { name: 'Healthcare', color: '#14b8a6', group: 'VARIABLE' },

  // Savings
  { name: 'Savings Transfer', color: '#059669', group: 'SAVINGS' },

  // Transfers
  { name: 'Internal Transfer', color: '#64748b', group: 'TRANSFER' },
];

async function main() {
  console.log('🌱 Seeding database with default Wallets and Categories...');

  // 1. Seed Wallets
  for (const wallet of DEFAULT_WALLETS) {
    await prisma.wallet.upsert({
      where: { name: wallet.name },
      update: {},
      create: wallet,
    });
    console.log(`  ✓ Wallet: "${wallet.name}"`);
  }

  // 2. Seed Categories
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
    console.log(`  ✓ Category: "${category.name}" [${category.group}]`);
  }

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
