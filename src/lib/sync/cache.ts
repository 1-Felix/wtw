import type { Series, Movie } from "@/lib/models/media";
import type { SyncState } from "@/lib/models/sync";
import { createInitialSyncState } from "@/lib/models/sync";
import type { JellyfinSyncResult } from "@/lib/sync/jellyfin-sync";
import type { SonarrSeriesData } from "@/lib/sync/sonarr-sync";
import type { RadarrMovieData } from "@/lib/sync/radarr-sync";

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

let cache: CacheData = {
  series: [],
  movies: [],
  syncState: createInitialSyncState(true, false, false),
  lastJellyfinData: null,
  lastSonarrData: [],
  lastRadarrData: [],
};

export function getCache(): Readonly<CacheData> {
  return cache;
}

export function updateMedia(series: Series[], movies: Movie[]) {
  cache = { ...cache, series, movies };
}

export function updateSyncState(syncState: SyncState) {
  cache = { ...cache, syncState };
}

export function getSyncState(): SyncState {
  return cache.syncState;
}

export function updateLastJellyfinData(data: JellyfinSyncResult) {
  cache = { ...cache, lastJellyfinData: data };
}

export function getLastJellyfinData(): JellyfinSyncResult | null {
  return cache.lastJellyfinData;
}

export function updateLastSonarrData(data: SonarrSeriesData[]) {
  cache = { ...cache, lastSonarrData: data };
}

export function updateLastRadarrData(data: RadarrMovieData[]) {
  cache = { ...cache, lastRadarrData: data };
}

export function getLastSonarrData(): SonarrSeriesData[] {
  return cache.lastSonarrData;
}

export function getLastRadarrData(): RadarrMovieData[] {
  return cache.lastRadarrData;
}
