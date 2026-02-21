import { JellyfinClient } from "@/lib/clients/jellyfin";
import { SonarrClient } from "@/lib/clients/sonarr";
import { RadarrClient } from "@/lib/clients/radarr";
import { getEnvConfig, isSonarrConfigured, isRadarrConfigured } from "@/lib/config/env";
import { reloadRulesConfig } from "@/lib/config/rules";
import { syncJellyfin, type JellyfinSyncResult } from "./jellyfin-sync";
import { syncSonarr } from "./sonarr-sync";
import { syncRadarr } from "./radarr-sync";
import { mergeSeries, mergeMovies } from "./merger";
import {
  updateMedia,
  updateSyncState,
  getSyncState,
  updateLastJellyfinData,
  getLastJellyfinData,
  updateLastSonarrData,
  updateLastRadarrData,
  getLastSonarrData,
  getLastRadarrData,
} from "./cache";
import type { SyncState, ServiceStatus } from "@/lib/models/sync";
import { createInitialSyncState } from "@/lib/models/sync";

let syncInProgress = false;
let syncTimer: ReturnType<typeof setInterval> | null = null;

/** Run a full sync cycle */
export async function runSync(): Promise<void> {
  if (syncInProgress) {
    console.log("Sync already in progress, skipping.");
    return;
  }

  syncInProgress = true;
  const currentState = getSyncState();
  const now = new Date().toISOString();

  updateSyncState({
    ...currentState,
    phase: "syncing",
    lastSyncStart: now,
  });

  const services = { ...currentState.services };

  // Reload rules config on each sync
  reloadRulesConfig();

  // --- Jellyfin (required) ---
  let jellyfinResult = getLastJellyfinData();
  try {
    const client = new JellyfinClient();
    jellyfinResult = await syncJellyfin(client);
    updateLastJellyfinData(jellyfinResult);
    services.jellyfin = markSuccess(services.jellyfin);
  } catch (err) {
    console.error("Jellyfin sync failed, retaining last cached data:", err);
    services.jellyfin = markError(services.jellyfin, err);
    // jellyfinResult already holds getLastJellyfinData()
  }

  // --- Sonarr (optional) ---
  let sonarrData = getLastSonarrData();
  if (isSonarrConfigured()) {
    try {
      const client = new SonarrClient();
      sonarrData = await syncSonarr(client);
      updateLastSonarrData(sonarrData);
      services.sonarr = markSuccess(services.sonarr);
    } catch (err) {
      console.error("Sonarr sync failed, retaining last cached data:", err);
      services.sonarr = markError(services.sonarr, err);
      // sonarrData already holds getLastSonarrData()
    }
  }

  // --- Radarr (optional) ---
  let radarrData = getLastRadarrData();
  if (isRadarrConfigured()) {
    try {
      const client = new RadarrClient();
      radarrData = await syncRadarr(client);
      updateLastRadarrData(radarrData);
      services.radarr = markSuccess(services.radarr);
    } catch (err) {
      console.error("Radarr sync failed, retaining last cached data:", err);
      services.radarr = markError(services.radarr, err);
      // radarrData already holds getLastRadarrData()
    }
  }

  // --- Merge ---
  if (jellyfinResult) {
    const mergedSeries = mergeSeries(jellyfinResult.series, sonarrData);
    const mergedMovies = mergeMovies(jellyfinResult.movies, radarrData);
    updateMedia(mergedSeries, mergedMovies);
  }

  const endTime = new Date().toISOString();
  updateSyncState({
    phase: "idle",
    lastSyncStart: now,
    lastSyncEnd: endTime,
    services,
  });

  syncInProgress = false;
  console.log(`Sync completed at ${endTime}`);
}

/** Start the periodic sync scheduler */
export function startSyncScheduler(): void {
  const config = getEnvConfig();
  const intervalMs = config.SYNC_INTERVAL_MINUTES * 60 * 1000;

  // Initialize sync state
  updateSyncState(
    createInitialSyncState(true, isSonarrConfigured(), isRadarrConfigured())
  );

  // Run initial sync immediately
  runSync().catch((err) => {
    console.error("Initial sync failed:", err);
  });

  // Schedule periodic sync
  syncTimer = setInterval(() => {
    runSync().catch((err) => {
      console.error("Scheduled sync failed:", err);
    });
  }, intervalMs);

  console.log(
    `Sync scheduler started. Interval: ${config.SYNC_INTERVAL_MINUTES} minutes.`
  );
}

/** Stop the sync scheduler */
export function stopSyncScheduler(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

/** Trigger a manual sync (resets the timer) */
export async function triggerManualSync(): Promise<void> {
  if (syncInProgress) return;

  // Reset the timer
  if (syncTimer) {
    stopSyncScheduler();
  }

  await runSync();

  // Restart periodic scheduler
  const config = getEnvConfig();
  const intervalMs = config.SYNC_INTERVAL_MINUTES * 60 * 1000;
  syncTimer = setInterval(() => {
    runSync().catch((err) => {
      console.error("Scheduled sync failed:", err);
    });
  }, intervalMs);
}

export function isSyncing(): boolean {
  return syncInProgress;
}

// --- Helpers ---

function markSuccess(status: ServiceStatus): ServiceStatus {
  return {
    ...status,
    connected: true,
    lastSuccess: new Date().toISOString(),
  };
}

function markError(status: ServiceStatus, err: unknown): ServiceStatus {
  return {
    ...status,
    connected: false,
    lastError: new Date().toISOString(),
    lastErrorMessage:
      err instanceof Error ? err.message : String(err),
  };
}
