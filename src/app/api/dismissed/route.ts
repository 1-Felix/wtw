import { NextResponse } from "next/server";
import { getAllDismissed } from "@/lib/db/dismissed";

/**
 * GET /api/dismissed — list all dismissed items.
 */
export async function GET() {
  try {
    const items = getAllDismissed();
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list dismissed items" },
      { status: 500 }
    );
  }
}
