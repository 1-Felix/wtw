import { NextResponse } from "next/server";
import { getCache } from "@/lib/sync/cache";
import { evaluateSeason, evaluateMovie } from "@/lib/rules/evaluator";
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
}

interface MovieWithVerdict {
  id: string;
  title: string;
  year: number | null;
  posterImageId: string | null;
  dateAdded: string;
  audioLanguages: string[];
  verdict: ReadinessVerdict;
}

export async function GET() {
  const cache = getCache();
  const readySeasons: SeasonWithVerdict[] = [];
  const almostReadySeasons: SeasonWithVerdict[] = [];
  const readyMovies: MovieWithVerdict[] = [];
  const almostReadyMovies: MovieWithVerdict[] = [];

  for (const series of cache.series) {
    for (const season of series.seasons) {
      const verdict = evaluateSeason(season, series);
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
      };

      if (verdict.status === "ready") readySeasons.push(item);
      else if (verdict.status === "almost-ready") almostReadySeasons.push(item);
    }
  }

  for (const movie of cache.movies) {
    if (movie.isWatched) continue;
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
