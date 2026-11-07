import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE /api/budgets/:id  — removes a budget row for a given month
// The "id" segment is used as a lookup key but the real constraint is
// yearMonth + categoryId, passed as query params for safety.
// Callers may also pass the real DB id directly.
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const yearMonth = searchParams.get('yearMonth');
        const categoryId = searchParams.get('categoryId');

        if (yearMonth && categoryId) {
            // Preferred: delete by unique composite key
            await prisma.budget.deleteMany({
                where: { yearMonth, categoryId }
            });
        } else {
            // Fallback: delete by primary key (skip virtual- ids)
            if (id.startsWith('virtual-')) {
                // Nothing to delete — it's not persisted
                return NextResponse.json({ ok: true });
            }
            await prisma.budget.delete({ where: { id } });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to remove budget' }, { status: 500 });
    }
}
