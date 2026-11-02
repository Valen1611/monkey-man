import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return NextResponse.json(
                { error: 'Invalid or missing month parameter. Expected format: YYYY-MM' },
                { status: 400 }
            );
        }

        // Fetch all transactions for the specified month, excluding internal transfers
        const transactions = await prisma.transaction.findMany({
            where: {
                date: { startsWith: month },
                toWalletId: null // Exclude internal wallet transfers
            },
            include: {
                category: {
                    select: { group: true }
                }
            }
        });

        // Calculate totals by group
        let totalIncome = 0;
        let totalFixed = 0;
        let totalVariable = 0;
        let totalSavings = 0;

        for (const tx of transactions) {
            const group = tx.category?.group;
            const amount = tx.amount;

            if (group === 'INCOME') {
                totalIncome += amount;
            } else if (group === 'FIXED') {
                totalFixed += amount;
            } else if (group === 'VARIABLE') {
                totalVariable += amount;
            } else if (group === 'SAVINGS') {
                totalSavings += amount;
            }
        }

        const totalExpenses = totalFixed + totalVariable + totalSavings;
        const remaining = totalIncome - totalExpenses;
        const spentPercentage = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

        return NextResponse.json({
            month,
            income: totalIncome,
            expenses: {
                total: totalExpenses,
                fixed: totalFixed,
                variable: totalVariable,
                savings: totalSavings
            },
            remaining,
            spentPercentage
        });
    } catch (error) {
        console.error('Failed to fetch monthly summary', error);
        return NextResponse.json(
            { error: 'Failed to fetch monthly summary' },
            { status: 500 }
        );
    }
}
