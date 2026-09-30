import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const wallets = await prisma.wallet.findMany({
            where: { isDeleted: false },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(wallets);
    } catch (error) {
        console.error('Error fetching wallets:', error);
        return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, color, balance, imageUrl } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Wallet name is required' }, { status: 400 });
        }

        const trimmedName = name.trim();

        const existing = await prisma.wallet.findUnique({
            where: { name: trimmedName }
        });

        const parsedBalance = typeof balance === 'number' ? balance : parseFloat(balance) || 0;

        if (existing) {
            if (!existing.isDeleted) {
                return NextResponse.json({ error: 'A wallet with this name already exists' }, { status: 409 });
            }

            // Revive soft-deleted wallet with new properties
            const revived = await prisma.wallet.update({
                where: { id: existing.id },
                data: {
                    isDeleted: false,
                    color: color || '#3b82f6',
                    imageUrl: imageUrl || null,
                    balance: parsedBalance
                }
            });
            return NextResponse.json(revived, { status: 201 });
        }

        const wallet = await prisma.wallet.create({
            data: {
                name: trimmedName,
                color: color || '#3b82f6',
                imageUrl: imageUrl || null,
                balance: parsedBalance
            }
        });

        return NextResponse.json(wallet, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 });
    }
}
