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
  ready: {
    seasons: SeasonWithVerdict[];
    movies: MovieWithVerdict[];
  };
  syncState: {
    phase: "idle" | "syncing" | "initializing";
  };
}

async function getMediaData(): Promise<MediaResponse> {
  // Fetch from internal API to ensure we get the shared module state
  // (instrumentation and API routes share context, but Server Components don't)
  const res = await fetch("http://localhost:3000/api/media", {
    cache: "no-store",
  });
  return res.json();
}

export default async function ReadyToWatchPage() {
  const data = await getMediaData();
  const { ready, syncState } = data;

  if (syncState.phase === "initializing") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Running initial sync...</p>
        </div>
      </div>
    );
  }

  const isEmpty = ready.seasons.length === 0 && ready.movies.length === 0;

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
          {ready.seasons.length > 0 && (
            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Series
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 tv:gap-6">
                {ready.seasons.map((item) => (
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

          {ready.movies.length > 0 && (
            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Movies
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 tv:gap-6">
                {ready.movies.map((item) => (
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
