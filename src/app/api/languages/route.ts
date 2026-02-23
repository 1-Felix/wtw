import { NextResponse } from "next/server";
import { getCache } from "@/lib/sync/cache";

export async function GET() {
  const cache = getCache();

  const audioSet = new Set<string>();
  const subtitleSet = new Set<string>();

  // Collect from series episodes
  for (const series of cache.series) {
    for (const season of series.seasons) {
      for (const episode of season.episodes) {
        for (const stream of episode.audioStreams) {
          if (stream.language) audioSet.add(stream.language);
        }
        for (const stream of episode.subtitleStreams) {
          if (stream.language) subtitleSet.add(stream.language);
        }
      }
    }
  }

  // Collect from movies
  for (const movie of cache.movies) {
    for (const stream of movie.audioStreams) {
      if (stream.language) audioSet.add(stream.language);
    }
    for (const stream of movie.subtitleStreams) {
      if (stream.language) subtitleSet.add(stream.language);
    }
  }

  return NextResponse.json({
    audio: [...audioSet].sort(),
    subtitle: [...subtitleSet].sort(),
  });
}
