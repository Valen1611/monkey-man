import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { name, color, balance, imageUrl } = body;

        const existing = await prisma.wallet.findUnique({
            where: { id }
        });

        if (!existing || existing.isDeleted) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const data: { name?: string; color?: string; balance?: number; imageUrl?: string | null } = {};

        if (name && typeof name === 'string' && name.trim()) {
            const trimmedName = name.trim();
            if (trimmedName !== existing.name) {
                const nameConflict = await prisma.wallet.findUnique({
                    where: { name: trimmedName }
                });
                if (nameConflict && nameConflict.id !== id) {
                    return NextResponse.json({ error: 'A wallet with this name already exists' }, { status: 409 });
                }
            }
            data.name = trimmedName;
        }

        if (color && typeof color === 'string') {
            data.color = color;
        }

        if (imageUrl !== undefined) {
            data.imageUrl = imageUrl || null;
        }

        if (balance !== undefined && balance !== null) {
            const parsedBalance = typeof balance === 'number' ? balance : parseFloat(balance);
            if (!Number.isNaN(parsedBalance)) {
                data.balance = parsedBalance;
            }
        }

        const updated = await prisma.wallet.update({
            where: { id },
            data
        });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to update wallet';
        console.error('Error updating wallet:', error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const wallet = await prisma.wallet.findUnique({
            where: { id }
        });

        if (!wallet || wallet.isDeleted) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        // Prevent leaving the database with zero active wallets
        const activeWallets = await prisma.wallet.count({
            where: { isDeleted: false }
        });
        if (activeWallets <= 1) {
            return NextResponse.json(
                { error: 'Cannot delete the only wallet in the system. Create another wallet first.' },
                { status: 400 }
            );
        }

        // Soft-delete wallet and unlink any parser rules that assigned this wallet.
        // Existing transactions remain linked to preserve spending history and balances.
        await prisma.$transaction([
            prisma.parserRule.updateMany({
                where: { walletId: id },
                data: { walletId: null }
            }),
            prisma.wallet.update({
                where: { id },
                data: { isDeleted: true }
            })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete wallet' }, { status: 500 });
    }
}
