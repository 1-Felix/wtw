import { JellyfinClient } from "@/lib/clients/jellyfin";
import { SonarrClient } from "@/lib/clients/sonarr";
import { RadarrClient } from "@/lib/clients/radarr";
import { getEnvConfig } from "@/lib/config/env";
import { getServiceConfig, isJellyfinFullyConfigured } from "@/lib/config/services";
import { reloadRulesConfig, getRulesConfig } from "@/lib/config/rules";
import { syncJellyfin, type JellyfinSyncResult } from "./jellyfin-sync";
import { syncSonarr } from "./sonarr-sync";
import { syncRadarr } from "./radarr-sync";
import { mergeSeries, mergeMovies } from "./merger";
import {
  updateMedia,
  updateSyncState,
  getSyncState,
  getCache,
  updateLastJellyfinData,
  getLastJellyfinData,
  updateLastSonarrData,
  updateLastRadarrData,
  getLastSonarrData,
  getLastRadarrData,
} from "./cache";
import type { SyncState, ServiceStatus } from "@/lib/models/sync";
import { createInitialSyncState } from "@/lib/models/sync";
import { evaluateSeason, evaluateMovie } from "@/lib/rules/evaluator";
import { isSeasonWatched } from "@/lib/models/media";
import type { VerdictMap, VerdictEntry } from "@/lib/notifications/transition-detector";
import { detectTransitions } from "@/lib/notifications/transition-detector";
import { dispatchNotifications } from "@/lib/notifications/dispatcher";

let syncInProgress = false;
let syncTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Previous verdict map for transition detection.
 * null means "first sync, no previous data" — skip notifications.
 */
let previousVerdicts: VerdictMap | null = null;

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

  // Re-read service config from DB + env on each sync cycle
  const serviceConfig = getServiceConfig();

  // --- Jellyfin (required) ---
  let jellyfinResult = getLastJellyfinData();
  if (serviceConfig.jellyfin) {
    try {
      const client = new JellyfinClient(
        serviceConfig.jellyfin.url,
        serviceConfig.jellyfin.apiKey,
        serviceConfig.jellyfin.userId
      );
      jellyfinResult = await syncJellyfin(client);
      updateLastJellyfinData(jellyfinResult);
      services.jellyfin = markSuccess(services.jellyfin);
    } catch (err) {
      console.error("Jellyfin sync failed, retaining last cached data:", err);
      services.jellyfin = markError(services.jellyfin, err);
    }
  }

  // --- Sonarr (optional) ---
  let sonarrData = getLastSonarrData();
  if (serviceConfig.sonarr) {
    try {
      const client = new SonarrClient(
        serviceConfig.sonarr.url,
        serviceConfig.sonarr.apiKey
      );
      sonarrData = await syncSonarr(client);
      updateLastSonarrData(sonarrData);
      services.sonarr = markSuccess(services.sonarr);
    } catch (err) {
      console.error("Sonarr sync failed, retaining last cached data:", err);
      services.sonarr = markError(services.sonarr, err);
    }
  }

  // --- Radarr (optional) ---
  let radarrData = getLastRadarrData();
  if (serviceConfig.radarr) {
    try {
      const client = new RadarrClient(
        serviceConfig.radarr.url,
        serviceConfig.radarr.apiKey
      );
      radarrData = await syncRadarr(client);
      updateLastRadarrData(radarrData);
      services.radarr = markSuccess(services.radarr);
    } catch (err) {
      console.error("Radarr sync failed, retaining last cached data:", err);
      services.radarr = markError(services.radarr, err);
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

  // --- Notification check ---
  try {
    const currentVerdicts = buildVerdictMap();
    const events = detectTransitions(previousVerdicts, currentVerdicts);

    if (events.length > 0) {
      await dispatchNotifications(events);
    }

    // Store for next comparison (even on first sync, so next sync can detect transitions)
    previousVerdicts = currentVerdicts;
  } catch (err) {
    console.error("Notification check failed:", err);
  }

  syncInProgress = false;
  console.log(`Sync completed at ${endTime}`);
}

/** Start the periodic sync scheduler (only if Jellyfin is configured) */
export function startSyncScheduler(): void {
  if (!isJellyfinFullyConfigured()) {
    console.log("Jellyfin not configured — sync scheduler not started. Configure via /setup.");
    return;
  }

  const config = getEnvConfig();
  const intervalMs = config.SYNC_INTERVAL_MINUTES * 60 * 1000;

  const serviceConfig = getServiceConfig();

  // Initialize sync state
  updateSyncState(
    createInitialSyncState(
      true,
      serviceConfig.sonarr !== null,
      serviceConfig.radarr !== null
    )
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

/**
 * Restart the sync scheduler with fresh configuration.
 * Waits for any in-progress sync to complete before restarting.
 */
export async function restartSyncScheduler(): Promise<void> {
  stopSyncScheduler();

  // Wait for in-progress sync to complete (up to 30s)
  if (syncInProgress) {
    const start = Date.now();
    while (syncInProgress && Date.now() - start < 30000) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  startSyncScheduler();
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

/**
 * Build a verdict map from the current cache for transition detection.
 */
function buildVerdictMap(): VerdictMap {
  const cache = getCache();
  const config = getRulesConfig();
  const map: VerdictMap = new Map();

  for (const series of cache.series) {
    for (const season of series.seasons) {
      if (config.hideWatched && isSeasonWatched(season)) continue;
      const verdict = evaluateSeason(season, series);
      const key = `${series.id}-s${season.seasonNumber}`;
      const entry: VerdictEntry = {
        mediaId: key,
        mediaTitle: series.title,
        mediaType: "season",
        seasonNumber: season.seasonNumber,
        status: verdict.status,
        episodeCurrent: season.availableEpisodes,
        episodeTotal: season.totalEpisodes,
        posterImageId: series.posterImageId,
        ruleResults: verdict.ruleResults,
      };
      map.set(key, entry);
    }
  }

  for (const movie of cache.movies) {
    if (config.hideWatched && movie.isWatched) continue;
    const verdict = evaluateMovie(movie);
    const entry: VerdictEntry = {
      mediaId: movie.id,
      mediaTitle: movie.title,
      mediaType: "movie",
      status: verdict.status,
      posterImageId: movie.posterImageId,
      ruleResults: verdict.ruleResults,
    };
    map.set(movie.id, entry);
  }

  return map;
}
