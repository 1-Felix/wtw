import { NextResponse } from "next/server";
import { getCache } from "@/lib/sync/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const cache = getCache();

  const series = cache.series.map((s) => ({
    id: s.id,
    title: s.title,
    tvdbId: s.tvdbId ?? undefined,
  }));

  return NextResponse.json({ series });
}
