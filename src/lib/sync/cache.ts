import { existsSync, readFileSync, writeFileSync } from "fs";
import type { Series, Movie } from "@/lib/models/media";
import type { SyncState } from "@/lib/models/sync";
import { createInitialSyncState } from "@/lib/models/sync";
import type { JellyfinSyncResult } from "@/lib/sync/jellyfin-sync";
import type { SonarrSeriesData } from "@/lib/sync/sonarr-sync";
import type { RadarrMovieData } from "@/lib/sync/radarr-sync";

const CACHE_FILE = "/config/cache.json";

export interface CacheData {
  series: Series[];
  movies: Movie[];
  syncState: SyncState;
  /** Last successfully fetched Jellyfin data, retained across failures */
  lastJellyfinData: JellyfinSyncResult | null;
  /** Last successfully fetched Sonarr data, retained across failures */
  lastSonarrData: SonarrSeriesData[];
  /** Last successfully fetched Radarr data, retained across failures */
  lastRadarrData: RadarrMovieData[];
}

function getDefaultCache(): CacheData {
  return {
    series: [],
    movies: [],
    syncState: createInitialSyncState(true, false, false),
    lastJellyfinData: null,
    lastSonarrData: [],
    lastRadarrData: [],
  };
}

function loadCache(): CacheData {
  try {
    if (existsSync(CACHE_FILE)) {
      const data = readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(data) as CacheData;
    }
  } catch (err) {
    console.error("Failed to load cache from file:", err);
  }
  return getDefaultCache();
}

function saveCache(cache: CacheData): void {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf-8");
  } catch (err) {
    console.error("Failed to save cache to file:", err);
  }
}

// In-memory cache that syncs to file
let cache: CacheData = loadCache();

export function getCache(): Readonly<CacheData> {
  // Always read from file to ensure we have the latest state
  // (handles module isolation between instrumentation and request handlers)
  cache = loadCache();
  return cache;
}

export function updateMedia(series: Series[], movies: Movie[]) {
  cache = { ...loadCache(), series, movies };
  saveCache(cache);
}

export function updateSyncState(syncState: SyncState) {
  cache = { ...loadCache(), syncState };
  saveCache(cache);
}

export function getSyncState(): SyncState {
  return getCache().syncState;
}

export function updateLastJellyfinData(data: JellyfinSyncResult) {
  cache = { ...loadCache(), lastJellyfinData: data };
  saveCache(cache);
}

export function getLastJellyfinData(): JellyfinSyncResult | null {
  return getCache().lastJellyfinData;
}

export function updateLastSonarrData(data: SonarrSeriesData[]) {
  cache = { ...loadCache(), lastSonarrData: data };
  saveCache(cache);
}

export function updateLastRadarrData(data: RadarrMovieData[]) {
  cache = { ...loadCache(), lastRadarrData: data };
  saveCache(cache);
}

export function getLastSonarrData(): SonarrSeriesData[] {
  return getCache().lastSonarrData;
}

export function getLastRadarrData(): RadarrMovieData[] {
  return getCache().lastRadarrData;
}
