import { SeasonCard, MovieCard } from "@/components/media-card";
import { getCache } from "@/lib/sync/cache";
import { evaluateSeason, evaluateMovie } from "@/lib/rules/evaluator";

export const dynamic = "force-dynamic";

export default function AlmostReadyPage() {
  const cache = getCache();

  const almostReadySeasons: Array<{
    seriesId: string;
    seriesTitle: string;
    seasonNumber: number;
    totalEpisodes: number;
    availableEpisodes: number;
    posterImageId: string | null;
    dateAdded: string;
    verdict: ReturnType<typeof evaluateSeason>;
  }> = [];

  const almostReadyMovies: Array<{
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
        });
      }
    }
  }

  for (const movie of cache.movies) {
    if (movie.isWatched) continue;
    const verdict = evaluateMovie(movie);
    if (verdict.status === "almost-ready") {
      almostReadyMovies.push({
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

  // Sort by progress (closest to ready first)
  almostReadySeasons.sort(
    (a, b) => b.verdict.progressPercent - a.verdict.progressPercent
  );
  almostReadyMovies.sort(
    (a, b) => b.verdict.progressPercent - a.verdict.progressPercent
  );

  const isEmpty =
    almostReadySeasons.length === 0 && almostReadyMovies.length === 0;

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold tracking-tight tv:text-2xl">
        Almost Ready
      </h2>

      {isEmpty ? (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No items are almost ready.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {almostReadySeasons.length > 0 && (
            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Series
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 tv:gap-6">
                {almostReadySeasons.map((item) => (
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

          {almostReadyMovies.length > 0 && (
            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Movies
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 tv:gap-6">
                {almostReadyMovies.map((item) => (
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
