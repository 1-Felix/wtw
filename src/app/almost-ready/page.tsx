import { SeasonCard, MovieCard } from "@/components/media-card";
import type { ReadinessVerdict } from "@/lib/models/readiness";

export const dynamic = "force-dynamic";

interface SeasonWithVerdict {
  seriesId: string;
  seriesTitle: string;
  seasonNumber: number;
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
  audioLanguages: string[];
  dateAdded: string;
  verdict: ReadinessVerdict;
}

interface MediaResponse {
  almostReady: {
    seasons: SeasonWithVerdict[];
    movies: MovieWithVerdict[];
  };
}

async function getMediaData(): Promise<MediaResponse> {
  const res = await fetch("http://localhost:3000/api/media", {
    cache: "no-store",
  });
  return res.json();
}

export default async function AlmostReadyPage() {
  const data = await getMediaData();
  const { almostReady } = data;

  // Sort by progress (closest to ready first)
  const almostReadySeasons = almostReady.seasons.sort(
    (a, b) => b.verdict.progressPercent - a.verdict.progressPercent
  );
  const almostReadyMovies = almostReady.movies.sort(
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
          <p className="text-muted-foreground">No items are almost ready.</p>
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
