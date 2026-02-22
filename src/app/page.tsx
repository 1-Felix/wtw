import { Suspense } from "react";
import { SyncGuard } from "@/components/sync-guard";
import { MediaGridView, SORT_READY } from "@/components/media-grid-view";
import type { SeasonItem, MovieItem } from "@/components/media-grid-view";
import { getCache } from "@/lib/sync/cache";
import { evaluateSeason, evaluateMovie } from "@/lib/rules/evaluator";
import { getDismissedIds } from "@/lib/db/dismissed";
import { getRulesConfig } from "@/lib/config/rules";
import { isSeasonWatched } from "@/lib/models/media";
import { groupSeasonsBySeries } from "@/lib/series-grouping";

export const dynamic = "force-dynamic";

export default function ReadyToWatchPage() {
  const cache = getCache();
  let dismissedIds: Set<string>;
  try {
    dismissedIds = getDismissedIds();
  } catch {
    dismissedIds = new Set();
  }

  const config = getRulesConfig();
  const readySeasons: SeasonItem[] = [];
  const readyMovies: MovieItem[] = [];

  for (const series of cache.series) {
    for (const season of series.seasons) {
      const seasonKey = `${series.id}-s${season.seasonNumber}`;
      if (dismissedIds.has(seasonKey)) continue;
      if (config.hideWatched && isSeasonWatched(season)) continue;
      const verdict = evaluateSeason(season, series);
      if (verdict.status === "ready") {
        const episodes = season.episodes.map((ep) => ({
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          hasFile: ep.hasFile,
          audioLanguages: ep.audioStreams.map((s) => s.language),
          isWatched: ep.isWatched,
          playbackProgress: ep.playbackProgress,
          lastPlayed: ep.lastPlayed,
        }));
        const watchedEpisodes = season.episodes.filter((ep) => ep.isWatched).length;
        const lastPlayedAt = season.episodes.reduce<string | null>((max, ep) => {
          if (!ep.lastPlayed) return max;
          if (!max) return ep.lastPlayed;
          return ep.lastPlayed > max ? ep.lastPlayed : max;
        }, null);
        readySeasons.push({
          seriesId: series.id,
          seriesTitle: series.title,
          seasonNumber: season.seasonNumber,
          totalEpisodes: season.totalEpisodes,
          availableEpisodes: season.availableEpisodes,
          posterImageId: series.posterImageId,
          dateAdded: series.dateAdded,
          verdict,
          episodes,
          watchedEpisodes,
          lastPlayedAt,
        });
      }
    }
  }

  for (const movie of cache.movies) {
    if (config.hideWatched && movie.isWatched) continue;
    if (dismissedIds.has(movie.id)) continue;
    const verdict = evaluateMovie(movie);
    if (verdict.status === "ready") {
      readyMovies.push({
        id: movie.id,
        title: movie.title,
        year: movie.year,
        posterImageId: movie.posterImageId,
        audioLanguages: [...new Set(movie.audioStreams.map((s) => s.language))],
        subtitleLanguages: [...new Set(movie.subtitleStreams.map((s) => s.language))],
        dateAdded: movie.dateAdded,
        verdict,
      });
    }
  }

  return (
    <SyncGuard>
      <div>
        <h2 className="mb-6 text-xl font-semibold tracking-tight tv:text-2xl">
          Ready to Watch
        </h2>

        <Suspense>
          <MediaGridView
            seasons={groupSeasonsBySeries(readySeasons)}
            movies={readyMovies}
            sort={SORT_READY}
            emptyMessage="No items are ready to watch yet."
            emptyAction={
              <a
                href="/almost-ready"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                Check Almost Ready &rarr;
              </a>
            }
          />
        </Suspense>
      </div>
    </SyncGuard>
  );
}
