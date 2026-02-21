import { SeasonCard, MovieCard } from "@/components/media-card";
import { getCache } from "@/lib/sync/cache";
import { evaluateSeason, evaluateMovie } from "@/lib/rules/evaluator";

export const dynamic = "force-dynamic";

export default function ReadyToWatchPage() {
  const cache = getCache();

  const readySeasons: Array<{
    seriesId: string;
    seriesTitle: string;
    seasonNumber: number;
    totalEpisodes: number;
    availableEpisodes: number;
    posterImageId: string | null;
    dateAdded: string;
    verdict: ReturnType<typeof evaluateSeason>;
  }> = [];

  const readyMovies: Array<{
    id: string;
    title: string;
    year: number | null;
    posterImageId: string | null;
    audioLanguages: string[];
    dateAdded: string;
    verdict: ReturnType<typeof evaluateMovie>;
  }> = [];

  for (const series of cache.series) {
    for (const season of series.seasons) {
      const verdict = evaluateSeason(season, series);
      if (verdict.status === "ready") {
        readySeasons.push({
          seriesId: series.id,
          seriesTitle: series.title,
          seasonNumber: season.seasonNumber,
          totalEpisodes: season.totalEpisodes,
          availableEpisodes: season.availableEpisodes,
          posterImageId: series.posterImageId,
          dateAdded: series.dateAdded,
          verdict,
        });
      }
    }
  }

  for (const movie of cache.movies) {
    if (movie.isWatched) continue;
    const verdict = evaluateMovie(movie);
    if (verdict.status === "ready") {
      readyMovies.push({
        id: movie.id,
        title: movie.title,
        year: movie.year,
        posterImageId: movie.posterImageId,
        audioLanguages: [...new Set(movie.audioStreams.map((s) => s.language))],
        dateAdded: movie.dateAdded,
        verdict,
      });
    }
  }

  readySeasons.sort(
    (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  );
  readyMovies.sort(
    (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  );

  const isEmpty = readySeasons.length === 0 && readyMovies.length === 0;

  if (cache.syncState.phase === "initializing") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">
            Running initial sync...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold tracking-tight tv:text-2xl">
        Ready to Watch
      </h2>

      {isEmpty ? (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No items are ready to watch yet.
          </p>
          <a
            href="/almost-ready"
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            Check Almost Ready &rarr;
          </a>
        </div>
      ) : (
        <div className="space-y-8">
          {readySeasons.length > 0 && (
            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Series
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 tv:gap-6">
                {readySeasons.map((item) => (
                  <SeasonCard
                    key={`${item.seriesId}-s${item.seasonNumber}`}
                    seriesTitle={item.seriesTitle}
                    seasonNumber={item.seasonNumber}
                    totalEpisodes={item.totalEpisodes}
                    availableEpisodes={item.availableEpisodes}
                    posterImageId={item.posterImageId}
                    verdict={item.verdict}
                  />
                ))}
              </div>
            </section>
          )}

          {readyMovies.length > 0 && (
            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Movies
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 tv:gap-6">
                {readyMovies.map((item) => (
                  <MovieCard
                    key={item.id}
                    title={item.title}
                    year={item.year}
                    posterImageId={item.posterImageId}
                    audioLanguages={item.audioLanguages}
                    verdict={item.verdict}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
