import { Suspense } from "react";
import { SyncGuard } from "@/components/sync-guard";
import { MediaGridView, SORT_ALMOST_READY } from "@/components/media-grid-view";
import type { SeasonItem, MovieItem } from "@/components/media-grid-view";
import { getCache } from "@/lib/sync/cache";
import { evaluateSeason, evaluateMovie } from "@/lib/rules/evaluator";
import { getDismissedIds } from "@/lib/db/dismissed";

export const dynamic = "force-dynamic";

export default function AlmostReadyPage() {
  const cache = getCache();
  let dismissedIds: Set<string>;
  try {
    dismissedIds = getDismissedIds();
  } catch {
    dismissedIds = new Set();
  }

  const almostReadySeasons: SeasonItem[] = [];
  const almostReadyMovies: MovieItem[] = [];

  for (const series of cache.series) {
    for (const season of series.seasons) {
      const seasonKey = `${series.id}-s${season.seasonNumber}`;
      if (dismissedIds.has(seasonKey)) continue;
      const verdict = evaluateSeason(season, series);
      if (verdict.status === "almost-ready") {
        almostReadySeasons.push({
          seriesId: series.id,
          seriesTitle: series.title,
          seasonNumber: season.seasonNumber,
          totalEpisodes: season.totalEpisodes,
          availableEpisodes: season.availableEpisodes,
          posterImageId: series.posterImageId,
          dateAdded: series.dateAdded,
          verdict,
          episodes: season.episodes.map((ep) => ({
            episodeNumber: ep.episodeNumber,
            title: ep.title,
            hasFile: ep.hasFile,
            audioLanguages: ep.audioStreams.map((s) => s.language),
          })),
        });
      }
    }
  }

  for (const movie of cache.movies) {
    if (movie.isWatched) continue;
    if (dismissedIds.has(movie.id)) continue;
    const verdict = evaluateMovie(movie);
    if (verdict.status === "almost-ready") {
      almostReadyMovies.push({
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
          Almost Ready
        </h2>

        <Suspense>
          <MediaGridView
            seasons={almostReadySeasons}
            movies={almostReadyMovies}
            sort={SORT_ALMOST_READY}
            emptyMessage="No items are almost ready."
          />
        </Suspense>
      </div>
    </SyncGuard>
  );
}
