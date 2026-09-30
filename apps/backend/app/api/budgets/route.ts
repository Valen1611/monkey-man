import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // e.g. "2026-09"
    
    if (!month) {
        return NextResponse.json({ error: 'Month is required' }, { status: 400 });
    }

    try {
        let budgets = await prisma.budget.findMany({
            where: { yearMonth: month },
            include: { category: true }
        });

        // Lazy Initialization
        if (budgets.length === 0) {
            // Find the most recent budget month before this one
            const lastBudget = await prisma.budget.findFirst({
                where: { yearMonth: { lt: month } },
                orderBy: { yearMonth: 'desc' }
            });

            if (lastBudget) {
                // Get all budgets from that last month
                const oldBudgets = await prisma.budget.findMany({
                    where: { yearMonth: lastBudget.yearMonth }
                });

                // Clone them to current month
                const newBudgetsData = oldBudgets.map(b => ({
                    yearMonth: month,
                    limit: b.limit,
                    categoryId: b.categoryId
                }));
                
                await prisma.budget.createMany({
                    data: newBudgetsData
                });

                // Fetch again to include categories
                budgets = await prisma.budget.findMany({
                    where: { yearMonth: month },
                    include: { category: true }
                });
            } else {
                // First time ever using budgets, maybe create defaults?
                // For now, let's just return empty array and user can add budgets manually.
                budgets = [];
            }
        }

        // Calculate usage dynamically from real transactions for this month
        // Excluding internal transfers between user's own wallets
        const transactions = await prisma.transaction.findMany({
            where: {
                date: { startsWith: month },
                toWalletId: null
            }
        });

        // Map usage by categoryId
        const usageByCategory: Record<string, number> = {};
        for (const t of transactions) {
            if (t.categoryId) {
                usageByCategory[t.categoryId] = (usageByCategory[t.categoryId] || 0) + t.amount;
            }
        }

        // Include all non-transfer categories so categories without an explicit limit still show their real usage
        const allCategories = await prisma.category.findMany({
            where: { group: { not: 'TRANSFER' } },
            orderBy: { name: 'asc' }
        });

        const budgetMap = new Map(budgets.map(b => [b.categoryId, b]));

        const result = allCategories.map(cat => {
            const existing = budgetMap.get(cat.id);
            return {
                id: existing ? existing.id : `virtual-${cat.id}`,
                yearMonth: month,
                limit: existing ? existing.limit : 0,
                categoryId: cat.id,
                category: cat,
                usage: usageByCategory[cat.id] || 0
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // body should be { yearMonth: "2026-09", categoryId: 1, limit: 500 }
        
        const budget = await prisma.budget.upsert({
            where: {
                yearMonth_categoryId: {
                    yearMonth: body.yearMonth,
                    categoryId: body.categoryId
                }
            },
            update: {
                limit: body.limit
            },
            create: {
                yearMonth: body.yearMonth,
                categoryId: body.categoryId,
                limit: body.limit
            },
            include: { category: true }
        });
        
        return NextResponse.json(budget);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
    }
}
