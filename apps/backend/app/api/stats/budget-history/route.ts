import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const months: string[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            months.push(`${y}-${m}`);
        }

        const earliestMonth = months[0];

        // Fetch all categories
        const categories = await prisma.category.findMany({
            where: { group: { not: 'TRANSFER' } },
            orderBy: { name: 'asc' }
        });

        // Fetch all budgets for the window
        const budgets = await prisma.budget.findMany({
            where: { yearMonth: { gte: earliestMonth } },
            include: { category: true }
        });

        // Fetch all non-transfer transactions for the window
        const transactions = await prisma.transaction.findMany({
            where: {
                date: { gte: earliestMonth },
                toWalletId: null
            },
            include: { category: true }
        });

        const history = months.map(m => {
            const monthBudgets = budgets.filter(b => b.yearMonth === m);
            const monthTxs = transactions.filter(t => t.date.startsWith(m));

            // Map usage by category
            const usageMap = new Map<string, number>();
            for (const tx of monthTxs) {
                if (tx.categoryId) {
                    usageMap.set(tx.categoryId, (usageMap.get(tx.categoryId) || 0) + tx.amount);
                }
            }

            // Map limit by category
            const limitMap = new Map<string, number>();
            for (const b of monthBudgets) {
                limitMap.set(b.categoryId, b.limit);
            }

            let totalExpenseLimit = 0;
            let totalExpenseActual = 0;
            let totalIncomeLimit = 0;
            let totalIncomeActual = 0;

            const byGroup: Record<string, { limit: number; actual: number }> = {
                FIXED: { limit: 0, actual: 0 },
                VARIABLE: { limit: 0, actual: 0 },
                SAVINGS: { limit: 0, actual: 0 },
                INCOME: { limit: 0, actual: 0 }
            };

            const categoryBreakdown: Array<{
                id: string;
                name: string;
                group: string;
                color: string;
                limit: number;
                actual: number;
                diff: number;
                isOver: boolean;
            }> = [];

            for (const cat of categories) {
                const limit = limitMap.get(cat.id) || 0;
                const actual = usageMap.get(cat.id) || 0;
                const grp = cat.group;

                if (byGroup[grp]) {
                    byGroup[grp].limit += limit;
                    byGroup[grp].actual += actual;
                }

                if (grp === 'INCOME') {
                    totalIncomeLimit += limit;
                    totalIncomeActual += actual;
                } else {
                    totalExpenseLimit += limit;
                    totalExpenseActual += actual;
                }

                categoryBreakdown.push({
                    id: cat.id,
                    name: cat.name,
                    group: grp,
                    color: cat.color,
                    limit,
                    actual,
                    diff: actual - limit,
                    isOver: limit > 0 && actual > limit
                });
            }

            const adherencePct = totalExpenseLimit > 0
                ? Math.round((totalExpenseActual / totalExpenseLimit) * 100)
                : 0;

            let status: 'under' | 'warning' | 'over' | 'unbudgeted' = 'under';
            if (totalExpenseLimit === 0) {
                status = 'unbudgeted';
            } else if (totalExpenseActual > totalExpenseLimit) {
                status = 'over';
            } else if (totalExpenseActual >= totalExpenseLimit * 0.9) {
                status = 'warning';
            }

            const overspentCategories = categoryBreakdown.filter(c => c.isOver);

            return {
                month: m,
                totalExpenseLimit,
                totalExpenseActual,
                totalIncomeLimit,
                totalIncomeActual,
                adherencePct,
                status,
                byGroup,
                overspentCategories,
                categoryBreakdown
            };
        });

        return NextResponse.json(history);
    } catch (error) {
        console.error('Failed to calculate budget history', error);
        return NextResponse.json({ error: 'Failed to calculate budget history' }, { status: 500 });
    }
}
