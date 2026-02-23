import { NextResponse } from "next/server";
import { deleteSettings } from "@/lib/db/settings";
import { restartSyncScheduler } from "@/lib/sync/orchestrator";
import { invalidateConfigCache } from "@/middleware";

const JELLYFIN_KEYS = [
  "jellyfin.url",
  "jellyfin.apiKey",
  "jellyfin.userId",
  "jellyfin.userName",
];

/**
 * DELETE /api/services/jellyfin — disconnect Jellyfin by removing DB keys and restarting scheduler.
 */
export async function DELETE() {
  try {
    deleteSettings(JELLYFIN_KEYS);
    invalidateConfigCache();
    await restartSyncScheduler();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disconnect Jellyfin" },
      { status: 500 }
    );
  }
}
