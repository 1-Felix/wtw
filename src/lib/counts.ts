import { getCache } from "@/lib/sync/cache";
import { evaluateSeason, evaluateMovie } from "@/lib/rules/evaluator";

export interface NavCounts {
  ready: number;
  almostReady: number;
  continue: number;
}

/**
 * Compute item counts for each navigation tab from the current cache.
 * Uses the same evaluation logic as the individual pages so badge
 * numbers stay consistent with what the user sees after navigating.
 */
export function getNavCounts(): NavCounts {
  const cache = getCache();

  let ready = 0;
  let almostReady = 0;
  let continueCount = 0;

  // Count ready / almost-ready seasons
  for (const series of cache.series) {
    for (const season of series.seasons) {
      const verdict = evaluateSeason(season, series);
      if (verdict.status === "ready") {
        ready++;
      } else if (verdict.status === "almost-ready") {
        almostReady++;
      }
    }
  }

  // Count ready / almost-ready movies (skip watched)
  for (const movie of cache.movies) {
    if (movie.isWatched) continue;
    const verdict = evaluateMovie(movie);
    if (verdict.status === "ready") {
      ready++;
    } else if (verdict.status === "almost-ready") {
      almostReady++;
    }
  }

  // Count in-progress episodes
  for (const series of cache.series) {
    for (const season of series.seasons) {
      for (const episode of season.episodes) {
        if (
          episode.playbackProgress !== null &&
          episode.playbackProgress > 0 &&
          !episode.isWatched
        ) {
          continueCount++;
        }
      }
    }
  }

  // Count in-progress movies
  for (const movie of cache.movies) {
    if (
      movie.playbackProgress !== null &&
      movie.playbackProgress > 0 &&
      !movie.isWatched
    ) {
      continueCount++;
    }
  }

  return {
    ready,
    almostReady,
    continue: continueCount,
  };
}
