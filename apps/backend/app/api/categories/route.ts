import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const category = await prisma.category.create({
            data: {
                name: body.name,
                color: body.color || '#808080',
                group: body.group || 'VARIABLE',
            }
        });
        return NextResponse.json(category);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
}
