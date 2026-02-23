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

/**
 * Use globalThis to ensure a single cache instance across all module
 * evaluation contexts. In Next.js standalone mode, the bundler may create
 * separate module instances for instrumentation vs request handlers.
 * globalThis is per-process, so it bridges that gap without file I/O.
 */
const CACHE_KEY = "__wtw_cache" as const;

declare global {
  // eslint-disable-next-line no-var
  var __wtw_cache: CacheData | undefined;
}

function getGlobalCache(): CacheData {
  if (!globalThis[CACHE_KEY]) {
    globalThis[CACHE_KEY] = getDefaultCache();
  }
  return globalThis[CACHE_KEY];
}

export function getCache(): Readonly<CacheData> {
  return getGlobalCache();
}

export function updateMedia(series: Series[], movies: Movie[]) {
  const cache = getGlobalCache();
  cache.series = series;
  cache.movies = movies;
}

export function updateSyncState(syncState: SyncState) {
  const cache = getGlobalCache();
  cache.syncState = syncState;
}

export function getSyncState(): SyncState {
  return getGlobalCache().syncState;
}

export function updateLastJellyfinData(data: JellyfinSyncResult) {
  getGlobalCache().lastJellyfinData = data;
}

export function getLastJellyfinData(): JellyfinSyncResult | null {
  return getGlobalCache().lastJellyfinData;
}

export function updateLastSonarrData(data: SonarrSeriesData[]) {
  getGlobalCache().lastSonarrData = data;
}

export function updateLastRadarrData(data: RadarrMovieData[]) {
  getGlobalCache().lastRadarrData = data;
}

export function getLastSonarrData(): SonarrSeriesData[] {
  return getGlobalCache().lastSonarrData;
}

export function getLastRadarrData(): RadarrMovieData[] {
  return getGlobalCache().lastRadarrData;
}

/**
 * Update the watched status of a single item (episode or movie) in the cache.
 * Returns true if the item was found and updated, false otherwise.
 */
export function markItemWatched(itemId: string, watched: boolean): boolean {
  const cache = getGlobalCache();

  // Search episodes
  for (const series of cache.series) {
    for (const season of series.seasons) {
      for (const episode of season.episodes) {
        if (episode.id === itemId) {
          episode.isWatched = watched;
          episode.playbackProgress = watched ? null : episode.playbackProgress;
          return true;
        }
      }
    }
  }

  // Search movies
  for (const movie of cache.movies) {
    if (movie.id === itemId) {
      movie.isWatched = watched;
      movie.playbackProgress = watched ? null : movie.playbackProgress;
      return true;
    }
  }

  return false;
}
