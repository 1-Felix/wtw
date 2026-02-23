import { NextResponse } from "next/server";
import { JellyfinClient } from "@/lib/clients/jellyfin";
import { getServiceConfig } from "@/lib/config/services";
import { markItemWatched } from "@/lib/sync/cache";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/media/[id]/watched — mark a media item as watched or unwatched in Jellyfin.
 * Body: { watched: boolean }
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const watched = (body as Record<string, unknown>).watched;
  if (typeof watched !== "boolean") {
    return NextResponse.json(
      { error: "Body must include { watched: boolean }" },
      { status: 400 }
    );
  }

  // Resolve Jellyfin config (env vars → DB settings)
  const config = getServiceConfig();
  if (!config.jellyfin) {
    return NextResponse.json(
      { error: "Jellyfin is not configured" },
      { status: 503 }
    );
  }

  const client = new JellyfinClient(
    config.jellyfin.url,
    config.jellyfin.apiKey,
    config.jellyfin.userId
  );

  try {
    if (watched) {
      await client.markAsWatched(id);
    } else {
      await client.markAsUnwatched(id);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Jellyfin API call failed" },
      { status: 502 }
    );
  }

  // Update the in-memory cache (best-effort; next sync will reconcile)
  markItemWatched(id, watched);

  return NextResponse.json({ success: true });
}
