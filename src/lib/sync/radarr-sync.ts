import { RadarrClient } from "@/lib/clients/radarr";

export interface RadarrMovieData {
  radarrId: number;
  title: string;
  tmdbId: string | null;
  imdbId: string | null;
  monitored: boolean;
  hasFile: boolean;
  audioLanguages: string[];
}

export async function syncRadarr(
  client: RadarrClient
): Promise<RadarrMovieData[]> {
  const allMovies = await client.getAllMovies();
  const result: RadarrMovieData[] = [];

  for (const movie of allMovies) {
    let audioLanguages: string[] = [];

    // Extract languages from movieFile if available
    if (movie.movieFile) {
      if (movie.movieFile.languages) {
        audioLanguages = movie.movieFile.languages.map((l) => l.name);
      } else if (movie.movieFile.mediaInfo?.audioLanguages) {
        audioLanguages = movie.movieFile.mediaInfo.audioLanguages
          .split("/")
          .map((l) => l.trim())
          .filter(Boolean);
      }
    }

    result.push({
      radarrId: movie.id,
      title: movie.title,
      tmdbId: movie.tmdbId ? String(movie.tmdbId) : null,
      imdbId: movie.imdbId ?? null,
      monitored: movie.monitored,
      hasFile: movie.hasFile,
      audioLanguages,
    });
  }

  return result;
}
