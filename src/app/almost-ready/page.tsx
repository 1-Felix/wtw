import { Suspense } from "react";
import { SyncGuard } from "@/components/sync-guard";
import { MediaGridView, SORT_ALMOST_READY } from "@/components/media-grid-view";
import type { SeasonItem, MovieItem } from "@/components/media-grid-view";
import { getCache } from "@/lib/sync/cache";
import { evaluateSeason, evaluateMovie } from "@/lib/rules/evaluator";
import { getDismissedIds } from "@/lib/db/dismissed";
import { getRulesConfig, getSeriesOverride } from "@/lib/config/rules";
import { isSeasonWatched } from "@/lib/models/media";
import { groupSeasonsBySeries } from "@/lib/series-grouping";
import { normalizeLanguage } from "@/lib/rules/language-available";
import { PageTitle } from "@/components/page-title";

export const dynamic = "force-dynamic";

export default function AlmostReadyPage() {
  const cache = getCache();
  let dismissedIds: Set<string>;
  try {
    dismissedIds = getDismissedIds();
  } catch {
    dismissedIds = new Set();
  }

  const config = getRulesConfig();
  const globalLangNormalized = normalizeLanguage(config.languageTarget);
  const almostReadySeasons: SeasonItem[] = [];
  const almostReadyMovies: MovieItem[] = [];

  for (const series of cache.series) {
    const override = getSeriesOverride(series.title, series.tvdbId ?? undefined);
    const overrideLang = override?.languageTarget;
    const languageOverride =
      overrideLang && normalizeLanguage(overrideLang) !== globalLangNormalized
        ? normalizeLanguage(overrideLang)
        : undefined;

    for (const season of series.seasons) {
      if (season.episodes.length === 0) continue;
      const seasonKey = `${series.id}-s${season.seasonNumber}`;
      if (dismissedIds.has(seasonKey)) continue;
      if (config.hideWatched && isSeasonWatched(season)) continue;
      const verdict = evaluateSeason(season, series);
      if (verdict.status === "almost-ready") {
        const episodes = season.episodes.map((ep) => ({
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          hasFile: ep.hasFile,
          hasAired: ep.hasAired,
          airDateUtc: ep.airDateUtc,
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
        almostReadySeasons.push({
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
          languageOverride,
        });
      }
    }
  }

  for (const movie of cache.movies) {
    if (config.hideWatched && movie.isWatched) continue;
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
        <PageTitle>Almost Ready</PageTitle>

        <Suspense>
          <MediaGridView
            seasons={groupSeasonsBySeries(almostReadySeasons)}
            movies={almostReadyMovies}
            sort={SORT_ALMOST_READY}
            emptyMessage="No items are almost ready."
          />
        </Suspense>
      </div>
    </SyncGuard>
  );
}
