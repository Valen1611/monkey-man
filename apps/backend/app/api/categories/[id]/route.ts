import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await request.json();
        const category = await prisma.category.update({
            where: { id },
            data: {
                name: body.name,
                color: body.color,
                group: body.group,
            }
        });
        return NextResponse.json(category);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        await prisma.$transaction([
            // 1. Unlink transactions so spending history is preserved
            prisma.transaction.updateMany({
                where: { categoryId: id },
                data: { categoryId: null }
            }),
            // 2. Unlink any parser rules that assigned this category
            prisma.parserRule.updateMany({
                where: { categoryId: id },
                data: { categoryId: null }
            }),
            // 3. Delete any budget entries specific to this category
            prisma.budget.deleteMany({
                where: { categoryId: id }
            }),
            // 4. Delete the category itself
            prisma.category.delete({
                where: { id }
            })
        ]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }
}
