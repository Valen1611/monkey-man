import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fromMonth, toMonth } = body;

        if (!toMonth) {
            return NextResponse.json({ error: 'toMonth is required (YYYY-MM)' }, { status: 400 });
        }

        // Determine source month: either fromMonth or the closest previous month with budgets
        let sourceMonth = fromMonth;
        if (!sourceMonth) {
            const previous = await prisma.budget.findFirst({
                where: { yearMonth: { lt: toMonth } },
                orderBy: { yearMonth: 'desc' }
            });
            sourceMonth = previous?.yearMonth;
        }

        if (!sourceMonth) {
            return NextResponse.json({ error: 'No previous budgets found to copy from' }, { status: 404 });
        }

        const sourceBudgets = await prisma.budget.findMany({
            where: { yearMonth: sourceMonth }
        });

        if (sourceBudgets.length === 0) {
            return NextResponse.json({ error: `No budgets found in source month ${sourceMonth}` }, { status: 404 });
        }

        const upsertPromises = sourceBudgets.map(b => 
            prisma.budget.upsert({
                where: {
                    yearMonth_categoryId: {
                        yearMonth: toMonth,
                        categoryId: b.categoryId
                    }
                },
                update: {
                    limit: b.limit
                },
                create: {
                    yearMonth: toMonth,
                    categoryId: b.categoryId,
                    limit: b.limit
                }
            })
        );

        const results = await prisma.$transaction(upsertPromises);

        return NextResponse.json({
            message: `Successfully copied ${results.length} budget limits from ${sourceMonth} to ${toMonth}`,
            count: results.length,
            fromMonth: sourceMonth,
            toMonth
        });
    } catch (error) {
        console.error('Failed to copy budgets', error);
        return NextResponse.json({ error: 'Failed to copy budgets' }, { status: 500 });
    }
}
