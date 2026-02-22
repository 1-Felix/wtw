import { PosterImage } from "./poster-image";
import { ReadinessBadge } from "./readiness-badge";
import { ProgressBar } from "./progress-bar";
import { formatSeasonSummary } from "@/lib/series-grouping";
import type { ReadinessVerdict } from "@/lib/models/readiness";

interface SeasonCardProps {
  seriesTitle: string;
  seasonNumber: number;
  totalEpisodes: number;
  availableEpisodes: number;
  posterImageId: string | null;
  verdict: ReadinessVerdict;
}

export function SeasonCard({
  seriesTitle,
  seasonNumber,
  totalEpisodes,
  availableEpisodes,
  posterImageId,
  verdict,
}: SeasonCardProps) {
  return (
    <div className="group overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary/30">
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <PosterImage
          itemId={posterImageId}
          title={seriesTitle}
          className="h-full w-full"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 tv:p-4 tv:pt-10">
          <ReadinessBadge status={verdict.status} />
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 p-3 tv:space-y-2 tv:p-4">
        <h3 className="truncate text-sm font-semibold text-foreground tv:text-base">
          {seriesTitle}
        </h3>
        <p className="text-xs text-muted-foreground tv:text-sm">
          Season {seasonNumber} &middot; {availableEpisodes}/{totalEpisodes}{" "}
          episodes
        </p>

        {verdict.status === "almost-ready" && (
          <ProgressBar
            value={verdict.progressPercent}
            label={verdict.ruleResults
              .filter((r) => !r.passed)
              .map((r) => r.detail)
              .join(", ")}
          />
        )}

        {verdict.status === "ready" && verdict.ruleResults.length > 0 && (
          <p className="text-[10px] text-muted-foreground tv:text-xs">
            {verdict.ruleResults.map((r) => r.detail).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

interface SeriesGroupCardProps {
  seriesTitle: string;
  seasonNumbers: number[];
  totalEpisodes: number;
  availableEpisodes: number;
  posterImageId: string | null;
  verdict: ReadinessVerdict;
}

export function SeriesGroupCard({
  seriesTitle,
  seasonNumbers,
  totalEpisodes,
  availableEpisodes,
  posterImageId,
  verdict,
}: SeriesGroupCardProps) {
  return (
    <div className="group overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary/30">
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <PosterImage
          itemId={posterImageId}
          title={seriesTitle}
          className="h-full w-full"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 tv:p-4 tv:pt-10">
          <ReadinessBadge status={verdict.status} />
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 p-3 tv:space-y-2 tv:p-4">
        <h3 className="truncate text-sm font-semibold text-foreground tv:text-base">
          {seriesTitle}
        </h3>
        <p className="text-xs text-muted-foreground tv:text-sm">
          {formatSeasonSummary(seasonNumbers)} &middot;{" "}
          {availableEpisodes}/{totalEpisodes} episodes
        </p>

        {verdict.status === "almost-ready" && (
          <ProgressBar
            value={verdict.progressPercent}
            label={verdict.ruleResults
              .filter((r) => !r.passed)
              .map((r) => r.detail)
              .join(", ")}
          />
        )}

        {verdict.status === "ready" && verdict.ruleResults.length > 0 && (
          <p className="text-[10px] text-muted-foreground tv:text-xs">
            {verdict.ruleResults.map((r) => r.detail).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

interface MovieCardProps {
  title: string;
  year: number | null;
  posterImageId: string | null;
  audioLanguages: string[];
  verdict: ReadinessVerdict;
}

export function MovieCard({
  title,
  year,
  posterImageId,
  audioLanguages,
  verdict,
}: MovieCardProps) {
  return (
    <div className="group overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary/30">
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <PosterImage
          itemId={posterImageId}
          title={title}
          className="h-full w-full"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 tv:p-4 tv:pt-10">
          <ReadinessBadge status={verdict.status} />
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 p-3 tv:space-y-2 tv:p-4">
        <h3 className="truncate text-sm font-semibold text-foreground tv:text-base">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground tv:text-sm">
          {year ?? "Unknown year"}
          {audioLanguages.length > 0 &&
            ` · ${audioLanguages.slice(0, 3).join(", ")}`}
        </p>
      </div>
    </div>
  );
}
