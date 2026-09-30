import { NextResponse } from "next/server";
import { RULE_KEY_TYPES, isCaseInsensitiveKeyType } from "@/lib/ruleKeyTypes";

/**
 * Returns available `keyType` values defined in `src/lib/ruleKeyTypes.js`.
 * Used by the frontend rules interface to display and validate allowed key types.
 */
export async function GET() {
  return NextResponse.json({
    keyTypes: RULE_KEY_TYPES.map((value) => ({
      value,
      caseInsensitive: isCaseInsensitiveKeyType(value),
    })),
  });
}
