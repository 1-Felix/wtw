import { NextResponse } from "next/server";
import { getCache } from "@/lib/sync/cache";
import { evaluateSeason, evaluateMovie } from "@/lib/rules/evaluator";
import { getDismissedIds } from "@/lib/db/dismissed";
import { getRulesConfig } from "@/lib/config/rules";
import { isSeasonWatched } from "@/lib/models/media";
import type { ReadinessVerdict } from "@/lib/models/readiness";

interface SeasonWithVerdict {
  seriesId: string;
  seriesTitle: string;
  seasonNumber: number;
  seasonTitle: string;
  totalEpisodes: number;
  availableEpisodes: number;
  posterImageId: string | null;
  dateAdded: string;
  verdict: ReadinessVerdict;
  dismissed: boolean;
  seriesAudioLanguages: string[];
  seriesSubtitleLanguages: string[];
  /** Audio languages where at least one episode with a file is missing that language */
  seriesIncompleteLanguages: string[];
}

interface MovieWithVerdict {
  id: string;
  title: string;
  year: number | null;
  posterImageId: string | null;
  dateAdded: string;
  audioLanguages: string[];
  verdict: ReadinessVerdict;
  dismissed: boolean;
}

export async function GET() {
  const cache = getCache();
  let dismissedIds: Set<string>;
  try {
    dismissedIds = getDismissedIds();
  } catch {
    dismissedIds = new Set();
  }

  const config = getRulesConfig();
  const readySeasons: SeasonWithVerdict[] = [];
  const almostReadySeasons: SeasonWithVerdict[] = [];
  const readyMovies: MovieWithVerdict[] = [];
  const almostReadyMovies: MovieWithVerdict[] = [];

  for (const series of cache.series) {
    // Aggregate unique audio/subtitle languages across all episodes in this series
    const audioLangSet = new Set<string>();
    const subtitleLangSet = new Set<string>();
    for (const s of series.seasons) {
      for (const ep of s.episodes) {
        for (const stream of ep.audioStreams) {
          if (stream.language) audioLangSet.add(stream.language);
        }
        for (const stream of ep.subtitleStreams) {
          if (stream.language) subtitleLangSet.add(stream.language);
        }
      }
    }
    const seriesAudioLanguages = [...audioLangSet].sort();
    const seriesSubtitleLanguages = [...subtitleLangSet].sort();

    // Determine which audio languages are incomplete (at least one episode
    // with a file is missing that language)
    const seriesIncompleteLanguages = seriesAudioLanguages.filter((lang) => {
      for (const s of series.seasons) {
        for (const ep of s.episodes) {
          if (!ep.hasFile) continue;
          const hasLang = ep.audioStreams.some(
            (stream) => stream.language === lang,
          );
          if (!hasLang) return true;
        }
      }
      return false;
    });

    for (const season of series.seasons) {
      if (config.hideWatched && isSeasonWatched(season)) continue;
      const verdict = evaluateSeason(season, series);
      const seasonKey = `${series.id}-s${season.seasonNumber}`;
      const item: SeasonWithVerdict = {
        seriesId: series.id,
        seriesTitle: series.title,
        seasonNumber: season.seasonNumber,
        seasonTitle: season.title,
        totalEpisodes: season.totalEpisodes,
        availableEpisodes: season.availableEpisodes,
        posterImageId: series.posterImageId,
        dateAdded: series.dateAdded,
        verdict,
        dismissed: dismissedIds.has(seasonKey),
        seriesAudioLanguages,
        seriesSubtitleLanguages,
        seriesIncompleteLanguages,
      };

      if (verdict.status === "ready") readySeasons.push(item);
      else if (verdict.status === "almost-ready") almostReadySeasons.push(item);
    }
  }

  for (const movie of cache.movies) {
    if (config.hideWatched && movie.isWatched) continue;
    const verdict = evaluateMovie(movie);
    const languages = movie.audioStreams.map((s) => s.language);
    const item: MovieWithVerdict = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      posterImageId: movie.posterImageId,
      dateAdded: movie.dateAdded,
      audioLanguages: [...new Set(languages)],
      verdict,
      dismissed: dismissedIds.has(movie.id),
    };

    if (verdict.status === "ready") readyMovies.push(item);
    else if (verdict.status === "almost-ready") almostReadyMovies.push(item);
  }

  // Sort by date added (newest first)
  const byDate = (a: { dateAdded: string }, b: { dateAdded: string }) =>
    new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();

  return NextResponse.json({
    ready: {
      seasons: readySeasons.sort(byDate),
      movies: readyMovies.sort(byDate),
    },
    almostReady: {
      seasons: almostReadySeasons.sort(byDate),
      movies: almostReadyMovies.sort(byDate),
    },
    syncState: cache.syncState,
  });
}
