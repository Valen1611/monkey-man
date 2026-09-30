import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateTransactionWithBalance, deleteTransactionWithBalance } from '@/lib/transactionOperations';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await request.json();

        const updates: {
            amount?: number;
            date?: string;
            description?: string | null;
            categoryId?: string | null;
            walletId?: string;
            toWalletId?: string | null;
        } = {};

        if (body.amount !== undefined) {
            const parsed = parseFloat(body.amount);
            if (isNaN(parsed)) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
            updates.amount = parsed;
        }
        if (body.date !== undefined) updates.date = body.date;
        if (body.description !== undefined) updates.description = body.description;
        if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
        if (body.walletId !== undefined) updates.walletId = body.walletId;
        if (body.toWalletId !== undefined) updates.toWalletId = body.toWalletId;

        const updated = await updateTransactionWithBalance(prisma, id, updates);
        return NextResponse.json(updated);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update transaction';
        console.error(error);
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const deleted = await deleteTransactionWithBalance(prisma, id);
        if (!deleted) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete transaction';
        console.error(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
