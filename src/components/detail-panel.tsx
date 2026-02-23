"use client";

import { useCallback, useRef, useState } from "react";
import { Check, ChevronDown, CircleCheck, Play, AlertCircle, Clock, ArrowLeft, EyeOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PosterImage } from "./poster-image";
import { ReadinessBadge } from "./readiness-badge";
import { ProgressBar } from "./progress-bar";
import type { ReadinessVerdict, RuleResult } from "@/lib/models/readiness";
import { formatRelativeTime, formatAirDate } from "@/lib/utils";

// --- Shared types for items displayed in the panel ---

export interface SeasonDetailItem {
  type: "season";
  seriesId: string;
  seriesTitle: string;
  seasonNumber: number;
  totalEpisodes: number;
  availableEpisodes: number;
  posterImageId: string | null;
  verdict: ReadinessVerdict;
  episodes: EpisodeInfo[];
  watchedEpisodes: number;
  lastPlayedAt: string | null;
  dismissed?: boolean;
}

export interface EpisodeInfo {
  episodeNumber: number;
  title: string;
  hasFile: boolean;
  hasAired: boolean;
  airDateUtc: string | null;
  audioLanguages: string[];
  isWatched: boolean;
  playbackProgress: number | null;
  lastPlayed: string | null;
}

export interface MovieDetailItem {
  type: "movie";
  id: string;
  title: string;
  year: number | null;
  posterImageId: string | null;
  audioLanguages: string[];
  subtitleLanguages: string[];
  verdict: ReadinessVerdict;
  dismissed?: boolean;
}

export interface SeriesGroupDetailItem {
  type: "series-group";
  seriesId: string;
  seriesTitle: string;
  posterImageId: string | null;
  seasons: Omit<SeasonDetailItem, "type">[];
}

export type DetailItem =
  | SeasonDetailItem
  | SeriesGroupDetailItem
  | MovieDetailItem;

// --- Panel component ---

interface DetailPanelProps {
  item: DetailItem | null;
  onClose: () => void;
  onDismiss?: (mediaId: string, title: string) => void;
}

export function DetailPanel({ item, onClose, onDismiss }: DetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const touchStartTime = useRef(0);
  const directionLocked = useRef<"horizontal" | "vertical" | null>(null);

  // Swipe-to-dismiss thresholds
  const SWIPE_DISTANCE_THRESHOLD = 150;
  const SWIPE_VELOCITY_MIN_DISTANCE = 80;
  const SWIPE_VELOCITY_THRESHOLD = 0.5; // px/ms
  const DIRECTION_LOCK_THRESHOLD = 10; // px of movement before locking

  // Swipe-to-dismiss on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Remove any snap-back transition so the drag feels immediate
    if (panelRef.current) {
      panelRef.current.style.transition = "";
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    touchStartTime.current = Date.now();
    directionLocked.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Determine direction lock if not yet locked
    if (directionLocked.current === null) {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      if (absDeltaX > DIRECTION_LOCK_THRESHOLD || absDeltaY > DIRECTION_LOCK_THRESHOLD) {
        directionLocked.current = absDeltaX > absDeltaY ? "horizontal" : "vertical";
      }
    }

    // Only track horizontal movement if direction-locked to horizontal
    if (directionLocked.current !== "horizontal") return;

    // Only allow swiping right (positive delta)
    touchDeltaX.current = Math.max(0, deltaX);
    if (panelRef.current && touchDeltaX.current > 0) {
      panelRef.current.style.transform = `translateX(${touchDeltaX.current}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (panelRef.current) {
      const elapsed = Date.now() - touchStartTime.current;
      const velocity = elapsed > 0 ? touchDeltaX.current / elapsed : 0;

      const distanceMet = touchDeltaX.current > SWIPE_DISTANCE_THRESHOLD;
      const velocityMet =
        touchDeltaX.current > SWIPE_VELOCITY_MIN_DISTANCE &&
        velocity > SWIPE_VELOCITY_THRESHOLD;

      if (distanceMet || velocityMet) {
        // Swipe threshold met — close
        onClose();
      } else {
        // Snap back with smooth transition
        panelRef.current.style.transition = "transform 200ms ease-out";
        panelRef.current.style.transform = "";
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
    touchStartTime.current = 0;
    directionLocked.current = null;
  }, [onClose]);

  const handleDismiss = useCallback(() => {
    if (!item || !onDismiss) return;

    if (item.type === "season") {
      onDismiss(
        `${item.seriesId}-s${item.seasonNumber}`,
        `${item.seriesTitle} S${item.seasonNumber}`
      );
    } else if (item.type === "series-group") {
      // Dismiss using the seriesId — the grid view handles expanding
      // this into individual season dismiss keys
      onDismiss(item.seriesId, item.seriesTitle);
    } else {
      onDismiss(item.id, item.title);
    }
    onClose();
  }, [item, onDismiss, onClose]);

  const panelTitle = item
    ? item.type === "season"
      ? `${item.seriesTitle} — Season ${item.seasonNumber}`
      : item.type === "series-group"
        ? item.seriesTitle
        : item.title
    : "Details";

  const isDismissed = item
    ? item.type === "series-group"
      ? false
      : item.dismissed === true
    : false;

  return (
    <Sheet open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 overflow-y-auto p-0 md:max-w-[420px]"
      >
        {/* Accessible title (visually hidden, announced by screen readers) */}
        <SheetTitle className="sr-only">{panelTitle}</SheetTitle>

        {item && (
          <div
            ref={panelRef}
            className="flex min-h-full flex-col"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
              {/* Mobile back button */}
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              {/* Desktop title */}
              <span className="hidden text-sm font-semibold text-foreground md:block">
                Details
              </span>
              {/* Desktop close (hidden, Sheet handles Escape and overlay click) */}
              <span className="hidden md:block" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 p-4">
              {item.type === "season" ? (
                <SeasonDetail item={item} />
              ) : item.type === "series-group" ? (
                <SeriesGroupDetail item={item} />
              ) : (
                <MovieDetail item={item} />
              )}
            </div>

            {/* Footer — Dismiss button */}
            {onDismiss && !isDismissed && (
              <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
                <Button
                  variant="outline"
                  className="w-full text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDismiss}
                >
                  <EyeOff className="h-4 w-4" />
                  Dismiss{item.type === "series-group" ? " All Seasons" : ""}
                </Button>
              </div>
            )}
            {isDismissed && (
              <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
                <p className="text-center text-xs text-muted-foreground">
                  This item has been dismissed.
                </p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// --- Season detail ---

function SeasonDetail({ item }: { item: SeasonDetailItem }) {
  return (
    <>
      {/* Poster + title */}
      <div className="flex gap-4">
        <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-md">
          <PosterImage itemId={item.posterImageId} title={item.seriesTitle} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-semibold text-foreground">{item.seriesTitle}</h3>
          <p className="text-sm text-muted-foreground">Season {item.seasonNumber}</p>
          <ReadinessBadge status={item.verdict.status} />
          <ProgressBar
            value={item.verdict.progressPercent}
            label={`${Math.round(item.verdict.progressPercent * 100)}% complete`}
          />
        </div>
      </div>

      {/* Episodes: x/y */}
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">
          {item.availableEpisodes}/{item.totalEpisodes} episodes available
        </p>
        {item.watchedEpisodes > 0 && (
          <p className="text-xs text-muted-foreground">
            {item.watchedEpisodes}/{item.totalEpisodes} episodes watched
          </p>
        )}
        {item.lastPlayedAt && (
          <p className="text-xs text-muted-foreground">
            Last watched {formatRelativeTime(item.lastPlayedAt)}
          </p>
        )}
      </div>

      {/* Rule results */}
      <RuleResultsList results={item.verdict.ruleResults} />

      {/* Episode list */}
      {item.episodes.length > 0 && (
        <section>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Episodes
          </h4>
          <div className="space-y-1">
            {item.episodes.map((ep) => {
              const progressPercent = (!ep.isWatched && ep.playbackProgress != null && ep.playbackProgress > 0)
                ? Math.round(ep.playbackProgress * 100)
                : null;
              const isTba = !ep.hasAired && !ep.hasFile;
              return (
                <div
                  key={ep.episodeNumber}
                  className={`flex flex-col gap-0 rounded-md border border-border/50 bg-surface${isTba ? " opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-3 px-3 py-2">
                    <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground">
                      {String(ep.episodeNumber).padStart(2, "0")}
                    </span>
                    <EpisodeStatusIcon episode={ep} />
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                      {ep.title}
                    </span>
                    {isTba ? (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {ep.airDateUtc ? formatAirDate(ep.airDateUtc) : "TBA"}
                      </span>
                    ) : ep.audioLanguages.length > 0 ? (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {ep.audioLanguages.slice(0, 2).join(", ")}
                      </span>
                    ) : null}
                  </div>
                  {progressPercent != null && (
                    <div className="px-3 pb-1.5">
                      <div
                        role="progressbar"
                        aria-valuenow={progressPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${progressPercent}% watched`}
                        className="h-1 w-full overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

// --- Series group detail ---

function SeriesGroupDetail({ item }: { item: SeriesGroupDetailItem }) {
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(
    () => new Set()
  );

  const toggleSeason = useCallback((seasonNumber: number) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }
      return next;
    });
  }, []);

  const totalEpisodes = item.seasons.reduce(
    (sum, s) => sum + s.totalEpisodes,
    0
  );
  const availableEpisodes = item.seasons.reduce(
    (sum, s) => sum + s.availableEpisodes,
    0
  );

  return (
    <>
      {/* Poster + title */}
      <div className="flex gap-4">
        <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-md">
          <PosterImage
            itemId={item.posterImageId}
            title={item.seriesTitle}
            className="h-full w-full"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-semibold text-foreground">
            {item.seriesTitle}
          </h3>
          <p className="text-sm text-muted-foreground">
            {item.seasons.length} seasons
          </p>
          <p className="text-xs text-muted-foreground">
            {availableEpisodes}/{totalEpisodes} episodes available
          </p>
        </div>
      </div>

      {/* Season accordion */}
      <section>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Seasons
        </h4>
        <div className="space-y-2">
          {item.seasons.map((season) => {
            const isExpanded = expandedSeasons.has(season.seasonNumber);
            return (
              <div
                key={season.seasonNumber}
                className="overflow-hidden rounded-md border border-border"
              >
                {/* Season header — always visible */}
                <button
                  onClick={() => toggleSeason(season.seasonNumber)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30"
                >
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isExpanded ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  <span className="flex-1 text-sm font-medium text-foreground">
                    Season {season.seasonNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {season.availableEpisodes}/{season.totalEpisodes} episodes
                  </span>
                  <ReadinessBadge status={season.verdict.status} />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border px-3 py-3 space-y-4">
                    {/* Progress */}
                    <ProgressBar
                      value={season.verdict.progressPercent}
                      label={`${Math.round(season.verdict.progressPercent * 100)}% complete`}
                    />

                    {/* Watched info */}
                    {season.watchedEpisodes > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {season.watchedEpisodes}/{season.totalEpisodes} episodes
                        watched
                      </p>
                    )}
                    {season.lastPlayedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last watched{" "}
                        {formatRelativeTime(season.lastPlayedAt)}
                      </p>
                    )}

                    {/* Rule results */}
                    <RuleResultsList results={season.verdict.ruleResults} />

                    {/* Episode list */}
                    {season.episodes.length > 0 && (
                      <div className="space-y-1">
                        {season.episodes.map((ep) => {
                          const isInProgress =
                            !ep.isWatched &&
                            ep.playbackProgress != null &&
                            ep.playbackProgress > 0;
                          const isTba = !ep.hasAired && !ep.hasFile;
                          return (
                            <div
                              key={ep.episodeNumber}
                              className={`flex flex-col gap-0 rounded-md border border-border/50 bg-surface${isTba ? " opacity-60" : ""}`}
                            >
                              <div className="flex items-center gap-3 px-3 py-2">
                                <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground">
                                  {String(ep.episodeNumber).padStart(2, "0")}
                                </span>
                                <EpisodeStatusIcon episode={ep} />
                                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                                  {ep.title}
                                </span>
                                {isTba ? (
                                  <span className="shrink-0 text-[10px] text-muted-foreground">
                                    {ep.airDateUtc ? formatAirDate(ep.airDateUtc) : "TBA"}
                                  </span>
                                ) : ep.audioLanguages.length > 0 ? (
                                  <span className="shrink-0 text-[10px] text-muted-foreground">
                                    {ep.audioLanguages.slice(0, 2).join(", ")}
                                  </span>
                                ) : null}
                              </div>
                              {isInProgress && (
                                <div className="px-3 pb-1.5">
                                  <div
                                    role="progressbar"
                                    aria-valuenow={Math.round(
                                      ep.playbackProgress! * 100
                                    )}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`${Math.round(ep.playbackProgress! * 100)}% watched`}
                                    className="h-1 w-full overflow-hidden rounded-full bg-muted"
                                  >
                                    <div
                                      className="h-full rounded-full bg-primary/60"
                                      style={{
                                        width: `${Math.round(ep.playbackProgress! * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

// --- Movie detail ---

function MovieDetail({ item }: { item: MovieDetailItem }) {
  return (
    <>
      {/* Poster + title */}
      <div className="flex gap-4">
        <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-md">
          <PosterImage itemId={item.posterImageId} title={item.title} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
          {item.year && <p className="text-sm text-muted-foreground">{item.year}</p>}
          <ReadinessBadge status={item.verdict.status} />
        </div>
      </div>

      {/* Rule results */}
      <RuleResultsList results={item.verdict.ruleResults} />

      {/* Audio languages */}
      {item.audioLanguages.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Audio Languages
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {item.audioLanguages.map((lang) => (
              <span
                key={`audio-${lang}`}
                className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-foreground"
              >
                {lang}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Subtitle languages */}
      {item.subtitleLanguages.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Subtitles
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {item.subtitleLanguages.map((lang) => (
              <span
                key={`sub-${lang}`}
                className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-muted-foreground"
              >
                {lang}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// --- Episode status icon ---

function EpisodeStatusIcon({ episode }: { episode: EpisodeInfo }) {
  if (episode.isWatched) {
    return <CircleCheck className="h-3.5 w-3.5 shrink-0 text-primary" />;
  }
  if (episode.playbackProgress != null && episode.playbackProgress > 0) {
    return <Play className="h-3.5 w-3.5 shrink-0 text-primary/60" />;
  }
  if (episode.hasFile) {
    return <Check className="h-3.5 w-3.5 shrink-0 text-primary" />;
  }
  if (!episode.hasAired) {
    return <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />;
  }
  return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}

// --- Rule results list ---

function RuleResultsList({ results }: { results: RuleResult[] }) {
  if (results.length === 0) return null;

  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Rule Results
      </h4>
      <div className="space-y-1.5">
        {results.map((r) => (
          <div
            key={r.ruleName}
            className="flex items-center gap-2 text-xs"
          >
            {r.passed ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
            )}
            <span className="font-medium text-foreground">{r.ruleName}</span>
            <span className="text-muted-foreground">{r.detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
