/**
 * Centralized transaction balance management.
 * Ensures consistent atomic ledger updates across API routes and background workers.
 */

/**
 * Creates a transaction and applies the balance change to the associated wallet(s) atomically.
 *
 * Financial ledger rules:
 * - TRANSFER (or isInternalTransfer / toWalletId present):
 *     source wallet balance -= amount
 *     destination toWallet balance += amount
 * - INCOME:
 *     source wallet balance += amount
 * - EXPENSE (FIXED, VARIABLE, SAVINGS, or uncategorized):
 *     source wallet balance -= amount
 */
async function createTransactionWithBalance(prisma, data) {
  return await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { id: data.walletId } });
    if (!wallet || wallet.isDeleted) {
      throw new Error('Invalid or deleted source wallet');
    }

    if (data.toWalletId) {
      const toWallet = await tx.wallet.findUnique({ where: { id: data.toWalletId } });
      if (!toWallet || toWallet.isDeleted) {
        throw new Error('Invalid or deleted destination wallet');
      }
    }

    let category = null;
    if (data.categoryId) {
      category = await tx.category.findUnique({ where: { id: data.categoryId } });
      if (!category) {
        throw new Error('Invalid category ID');
      }
    }

    const transaction = await tx.transaction.create({
      data: {
        amount: data.amount,
        date: data.date || new Date().toISOString(),
        description: data.description || null,
        categoryId: category ? category.id : null,
        walletId: data.walletId,
        toWalletId: data.toWalletId || null,
      },
      include: { category: true, wallet: true, toWallet: true },
    });

    const group = category ? category.group : null;
    const isTransfer = Boolean(data.isInternalTransfer || group === 'TRANSFER' || data.toWalletId);
    const isIncome = group === 'INCOME';

    if (isTransfer) {
      await tx.wallet.update({
        where: { id: data.walletId },
        data: { balance: { decrement: data.amount } },
      });
      if (data.toWalletId) {
        await tx.wallet.update({
          where: { id: data.toWalletId },
          data: { balance: { increment: data.amount } },
        });
      }
    } else if (isIncome) {
      await tx.wallet.update({
        where: { id: data.walletId },
        data: { balance: { increment: data.amount } },
      });
    } else {
      // Default: expense (FIXED, VARIABLE, SAVINGS, or uncategorized)
      await tx.wallet.update({
        where: { id: data.walletId },
        data: { balance: { decrement: data.amount } },
      });
    }

    return transaction;
  });
}

/**
 * Reverses a transaction's balance changes and deletes the transaction record atomically.
 */
async function deleteTransactionWithBalance(prisma, id) {
  return await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!t) return null;

    const group = t.category ? t.category.group : null;
    const isTransfer = group === 'TRANSFER' || Boolean(t.toWalletId);
    const isIncome = group === 'INCOME';

    if (isTransfer) {
      await tx.wallet.update({
        where: { id: t.walletId },
        data: { balance: { increment: t.amount } },
      });
      if (t.toWalletId) {
        await tx.wallet.update({
          where: { id: t.toWalletId },
          data: { balance: { decrement: t.amount } },
        });
      }
    } else if (isIncome) {
      await tx.wallet.update({
        where: { id: t.walletId },
        data: { balance: { decrement: t.amount } },
      });
    } else {
      // Reverse expense
      await tx.wallet.update({
        where: { id: t.walletId },
        data: { balance: { increment: t.amount } },
      });
    }

    await tx.transaction.delete({ where: { id } });
    return t;
  });
}

/**
 * Updates a transaction and reconciles balance changes atomically.
 */
async function updateTransactionWithBalance(prisma, id, updates) {
  return await prisma.$transaction(async (tx) => {
    const oldT = await tx.transaction.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!oldT) throw new Error('Transaction not found');

    // 1. Reverse old balance changes
    const oldGroup = oldT.category ? oldT.category.group : null;
    const oldIsTransfer = oldGroup === 'TRANSFER' || Boolean(oldT.toWalletId);
    const oldIsIncome = oldGroup === 'INCOME';

    if (oldIsTransfer) {
      await tx.wallet.update({
        where: { id: oldT.walletId },
        data: { balance: { increment: oldT.amount } },
      });
      if (oldT.toWalletId) {
        await tx.wallet.update({
          where: { id: oldT.toWalletId },
          data: { balance: { decrement: oldT.amount } },
        });
      }
    } else if (oldIsIncome) {
      await tx.wallet.update({
        where: { id: oldT.walletId },
        data: { balance: { decrement: oldT.amount } },
      });
    } else {
      await tx.wallet.update({
        where: { id: oldT.walletId },
        data: { balance: { increment: oldT.amount } },
      });
    }

    // 2. Validate new wallets if provided
    const newWalletId = updates.walletId !== undefined ? updates.walletId : oldT.walletId;
    const newToWalletId = updates.toWalletId !== undefined ? updates.toWalletId : oldT.toWalletId;
    const newAmount = updates.amount !== undefined ? updates.amount : oldT.amount;

    const wallet = await tx.wallet.findUnique({ where: { id: newWalletId } });
    if (!wallet || wallet.isDeleted) throw new Error('Invalid or deleted source wallet');

    if (newToWalletId) {
      const toWallet = await tx.wallet.findUnique({ where: { id: newToWalletId } });
      if (!toWallet || toWallet.isDeleted) throw new Error('Invalid or deleted destination wallet');
    }

    // 3. Update the record
    const updated = await tx.transaction.update({
      where: { id },
      data: {
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.amount !== undefined ? { amount: updates.amount } : {}),
        ...(updates.date !== undefined ? { date: updates.date } : {}),
        ...(updates.categoryId !== undefined ? { categoryId: updates.categoryId || null } : {}),
        ...(updates.walletId !== undefined ? { walletId: updates.walletId } : {}),
        ...(updates.toWalletId !== undefined ? { toWalletId: updates.toWalletId || null } : {}),
      },
      include: { category: true, wallet: true, toWallet: true },
    });

    // 4. Apply new balance changes
    const newGroup = updated.category ? updated.category.group : null;
    const newIsTransfer = newGroup === 'TRANSFER' || Boolean(updated.toWalletId);
    const newIsIncome = newGroup === 'INCOME';

    if (newIsTransfer) {
      await tx.wallet.update({
        where: { id: updated.walletId },
        data: { balance: { decrement: newAmount } },
      });
      if (updated.toWalletId) {
        await tx.wallet.update({
          where: { id: updated.toWalletId },
          data: { balance: { increment: newAmount } },
        });
      }
    } else if (newIsIncome) {
      await tx.wallet.update({
        where: { id: updated.walletId },
        data: { balance: { increment: newAmount } },
      });
    } else {
      await tx.wallet.update({
        where: { id: updated.walletId },
        data: { balance: { decrement: newAmount } },
      });
    }

    return updated;
  });
}

module.exports = {
  createTransactionWithBalance,
  deleteTransactionWithBalance,
  updateTransactionWithBalance,
};
