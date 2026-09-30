import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isRuleKeyType, normalizeKeyValue } from "@/lib/ruleKeyTypes";

/**
 * Extracts Prisma error code (e.g. P2002 = UNIQUE, P2025 = Not Found).
 */
function prismaErrorCode(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: {
    keyType?: unknown;
    keyValue?: unknown;
    categoryId?: unknown;
    walletId?: unknown;
    isMine?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { keyType, keyValue, categoryId, walletId, isMine } = body;

  if (keyType !== undefined && !isRuleKeyType(keyType as string)) {
    return NextResponse.json({ error: "Invalid keyType" }, { status: 400 });
  }

  try {
    // Read existing rule before normalizing in case partial update omits keyType
    const existing = await prisma.parserRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const nextKeyType = (keyType !== undefined ? keyType : existing.keyType) as string;
    const nextKeyValue =
      keyValue !== undefined ? normalizeKeyValue(nextKeyType, keyValue as string) : existing.keyValue;

    if (!nextKeyValue) {
      return NextResponse.json({ error: "keyValue is required" }, { status: 400 });
    }

    const [category, wallet] = await Promise.all([
      categoryId ? prisma.category.findUnique({ where: { id: categoryId as string } }) : null,
      walletId ? prisma.wallet.findUnique({ where: { id: walletId as string } }) : null,
    ]);

    if (categoryId && !category) {
      return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
    }
    if (walletId && (!wallet || wallet.isDeleted)) {
      return NextResponse.json({ error: "Invalid walletId" }, { status: 400 });
    }

    // Only update specified fields; preserve existing relationships for partial updates
    const rule = await prisma.parserRule.update({
      where: { id },
      data: {
        keyType: nextKeyType,
        keyValue: nextKeyValue,
        ...(categoryId !== undefined ? { categoryId: category ? category.id : null } : {}),
        ...(walletId !== undefined ? { walletId: wallet ? wallet.id : null } : {}),
        ...(isMine !== undefined ? { isMine: Boolean(isMine) } : {}),
      },
      include: { category: true, wallet: true },
    });

    return NextResponse.json(rule);
  } catch (error: unknown) {
    if (prismaErrorCode(error) === "P2025") {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    if (prismaErrorCode(error) === "P2002") {
      return NextResponse.json(
        { error: "A rule for this keyType and keyValue already exists" },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Error updating rule" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.parserRule.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (prismaErrorCode(error) === "P2025") {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Error deleting rule" }, { status: 500 });
  }
}
