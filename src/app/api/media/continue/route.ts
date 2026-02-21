import { NextResponse } from "next/server";
import { getCache } from "@/lib/sync/cache";

export async function GET() {
  const cache = getCache();

  // Find in-progress episodes
  const inProgressEpisodes: Array<{
    type: "episode";
    id: string;
    seriesTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    episodeTitle: string;
    posterImageId: string | null;
    playbackProgress: number;
    lastPlayed: string | null;
  }> = [];

  for (const series of cache.series) {
    for (const season of series.seasons) {
      for (const episode of season.episodes) {
        if (
          episode.playbackProgress !== null &&
          episode.playbackProgress > 0 &&
          !episode.isWatched
        ) {
          inProgressEpisodes.push({
            type: "episode",
            id: episode.id,
            seriesTitle: series.title,
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
            episodeTitle: episode.title,
            posterImageId: series.posterImageId,
            playbackProgress: episode.playbackProgress,
            lastPlayed: episode.lastPlayed,
          });
        }
      }
    }
  }

  // Find in-progress movies
  const inProgressMovies: Array<{
    type: "movie";
    id: string;
    title: string;
    year: number | null;
    posterImageId: string | null;
    playbackProgress: number;
    lastPlayed: string | null;
  }> = [];

  for (const movie of cache.movies) {
    if (
      movie.playbackProgress !== null &&
      movie.playbackProgress > 0 &&
      !movie.isWatched
    ) {
      inProgressMovies.push({
        type: "movie",
        id: movie.id,
        title: movie.title,
        year: movie.year,
        posterImageId: movie.posterImageId,
        playbackProgress: movie.playbackProgress,
        lastPlayed: movie.lastPlayed,
      });
    }
  }

  // Combine and sort by last played (most recent first)
  const items = [...inProgressEpisodes, ...inProgressMovies].sort(
    (a, b) => {
      const aDate = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
      const bDate = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
      return bDate - aDate;
    }
  );

  return NextResponse.json({ items });
}
