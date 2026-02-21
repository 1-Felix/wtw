import { NextResponse } from "next/server";
import { getCache } from "@/lib/sync/cache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cache = getCache();
  const series = cache.series.find((s) => s.id === id);

  if (!series) {
    return NextResponse.json(
      { error: "Series not found" },
      { status: 404 }
    );
  }

  // Build language grid per season
  const seasons = series.seasons.map((season) => {
    // Collect all unique languages across episodes
    const allLanguages = new Set<string>();
    for (const ep of season.episodes) {
      for (const stream of ep.audioStreams) {
        allLanguages.add(stream.language);
      }
    }

    const languages = Array.from(allLanguages).sort();

    const episodes = season.episodes
      .sort((a, b) => a.episodeNumber - b.episodeNumber)
      .map((ep) => {
        const epLanguages = new Set(
          ep.audioStreams.map((s) => s.language)
        );
        return {
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          hasFile: ep.hasFile,
          languages: Object.fromEntries(
            languages.map((lang) => [lang, epLanguages.has(lang)])
          ),
          subtitles: ep.subtitleStreams.map((s) => s.language),
        };
      });

    return {
      seasonNumber: season.seasonNumber,
      title: season.title,
      languages,
      episodes,
    };
  });

  return NextResponse.json({
    seriesId: series.id,
    seriesTitle: series.title,
    seasons,
  });
}
