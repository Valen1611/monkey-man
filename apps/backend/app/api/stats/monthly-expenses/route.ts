import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        // Generate the last 6 calendar months (YYYY-MM) ending at the current month
        const months: string[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            months.push(`${y}-${m}`);
        }

        const earliestMonth = months[0];

        // Fetch transactions from the last 6 months, excluding internal wallet transfers
        const transactions = await prisma.transaction.findMany({
            where: {
                date: { gte: earliestMonth },
                toWalletId: null
            },
            include: {
                category: {
                    select: { group: true }
                }
            }
        });

        // Initialize 6 months map with zeroed groups
        const monthMap = new Map<string, {
            month: string;
            byGroup: Record<string, number>;
        }>();

        for (const m of months) {
            monthMap.set(m, {
                month: m,
                byGroup: {
                    FIXED: 0,
                    VARIABLE: 0,
                    SAVINGS: 0,
                    INCOME: 0
                }
            });
        }

        // Aggregate amounts by month and category group
        for (const tx of transactions) {
            const m = tx.date.slice(0, 7);
            const entry = monthMap.get(m);
            if (entry && tx.category?.group) {
                const group = tx.category.group;
                entry.byGroup[group] = (entry.byGroup[group] || 0) + tx.amount;
            }
        }

        const results = months.map((m) => {
            const entry = monthMap.get(m)!;
            const expenseTotal =
                (entry.byGroup.FIXED || 0) +
                (entry.byGroup.VARIABLE || 0) +
                (entry.byGroup.SAVINGS || 0);

            return {
                month: m,
                total: expenseTotal,
                byGroup: entry.byGroup
            };
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error("Failed to fetch monthly expenses", error);
        return NextResponse.json({ error: "Failed to fetch monthly expenses" }, { status: 500 });
    }
}
