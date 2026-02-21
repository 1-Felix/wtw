import { NextResponse } from "next/server";
import { triggerManualSync, isSyncing } from "@/lib/sync/orchestrator";
import { getSyncState } from "@/lib/sync/cache";

export async function POST() {
  if (isSyncing()) {
    return NextResponse.json(
      {
        message: "Sync already in progress",
        syncState: getSyncState(),
      },
      { status: 409 }
    );
  }

  // Trigger async — don't await
  triggerManualSync().catch((err) => {
    console.error("Manual sync failed:", err);
  });

  return NextResponse.json({
    message: "Sync triggered",
    syncState: getSyncState(),
  });
}
