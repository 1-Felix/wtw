import { NextResponse } from "next/server";
import { getSyncState } from "@/lib/sync/cache";
import { getRulesConfigError } from "@/lib/config/rules";

export async function GET() {
  const syncState = getSyncState();
  const isInitializing = syncState.phase === "initializing";
  const rulesConfigError = getRulesConfigError();

  const body = {
    status: isInitializing ? "initializing" : "ok",
    phase: syncState.phase,
    lastSyncStart: syncState.lastSyncStart,
    lastSyncEnd: syncState.lastSyncEnd,
    services: Object.values(syncState.services)
      .filter((s) => s.configured)
      .map((s) => ({
        name: s.name,
        connected: s.connected,
        lastSuccess: s.lastSuccess,
        lastError: s.lastError,
        lastErrorMessage: s.lastErrorMessage,
      })),
    rulesConfigError,
  };

  return NextResponse.json(body, {
    status: isInitializing ? 503 : 200,
  });
}
