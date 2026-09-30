import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await prisma.workerLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return NextResponse.json(logs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
