import { NextResponse } from "next/server";
import { getSyncState } from "@/lib/sync/cache";
import { getRulesConfigError, wasRulesJsonImported } from "@/lib/config/rules";
import { getEnvConfig } from "@/lib/config/env";
import { isJellyfinFullyConfigured } from "@/lib/config/services";

export async function GET() {
  // Check if any services are configured at all
  if (!isJellyfinFullyConfigured()) {
    return NextResponse.json({
      status: "setup_required",
      phase: "unconfigured",
      lastSyncStart: null,
      lastSyncEnd: null,
      syncIntervalMinutes: 15,
      rulesJsonImported: false,
      services: [],
      rulesConfigError: null,
    });
  }

  const syncState = getSyncState();
  const isInitializing = syncState.phase === "initializing";
  const rulesConfigError = getRulesConfigError();

  let syncIntervalMinutes = 15;
  try {
    syncIntervalMinutes = getEnvConfig().SYNC_INTERVAL_MINUTES;
  } catch {
    // env not yet validated during build
  }

  const body = {
    status: isInitializing ? "initializing" : "ok",
    phase: syncState.phase,
    lastSyncStart: syncState.lastSyncStart,
    lastSyncEnd: syncState.lastSyncEnd,
    syncIntervalMinutes,
    rulesJsonImported: wasRulesJsonImported(),
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
