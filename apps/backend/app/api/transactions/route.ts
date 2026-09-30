import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const transactions = await prisma.transaction.findMany({
            orderBy: { id: 'desc' },
            include: { category: true, wallet: true, toWallet: true }
        });
        return NextResponse.json(transactions);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}

import { createTransactionWithBalance } from '@/lib/transactionOperations';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (body.amount === undefined || body.amount === null || isNaN(Number(body.amount))) {
            return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
        }
        if (!body.walletId) {
            return NextResponse.json({ error: 'walletId is required' }, { status: 400 });
        }

        const transaction = await createTransactionWithBalance(prisma, {
            amount: parseFloat(body.amount),
            date: body.date,
            description: body.description,
            categoryId: body.categoryId || null,
            walletId: body.walletId,
            toWalletId: body.toWalletId || null,
        });

        return NextResponse.json(transaction, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create transaction';
        console.error(error);
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
