import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isRuleKeyType, normalizeKeyValue } from "@/lib/ruleKeyTypes";

/** Predictable stable sorting order for rule listings across requests. */
const STABLE_ORDER = [{ keyType: "asc" }, { keyValue: "asc" }] as const;

/**
 * Extracts Prisma error code (e.g. P2002 = UNIQUE, P2025 = Not Found).
 */
function prismaErrorCode(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
}

export async function GET() {
  try {
    const rules = await prisma.parserRule.findMany({
      include: { category: true, wallet: true },
      orderBy: [...STABLE_ORDER],
    });
    return NextResponse.json(rules);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error fetching rules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

  if (!isRuleKeyType(keyType as string)) {
    return NextResponse.json({ error: "Invalid keyType" }, { status: 400 });
  }

  // Normalization happens here on write to ensure persistence matches lookup format
  const normalizedKey = normalizeKeyValue(keyType as string, keyValue as string);
  if (!normalizedKey) {
    return NextResponse.json({ error: "keyValue is required" }, { status: 400 });
  }

  try {
    // Validate target category and wallet exist before creating rule
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

    const rule = await prisma.parserRule.create({
      data: {
        keyType: keyType as string,
        keyValue: normalizedKey,
        categoryId: category ? category.id : null,
        walletId: wallet ? wallet.id : null,
        isMine: Boolean(isMine),
      },
      include: { category: true, wallet: true },
    });
    return NextResponse.json(rule, { status: 201 });
  } catch (error: unknown) {
    if (prismaErrorCode(error) === "P2002") {
      return NextResponse.json(
        { error: "A rule for this keyType and keyValue already exists" },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Error creating rule" }, { status: 500 });
  }
}
