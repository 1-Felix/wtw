"use client";

import { useCallback, useRef } from "react";
import { Check, AlertCircle, ArrowLeft, EyeOff } from "lucide-react";
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
  dismissed?: boolean;
}

export interface EpisodeInfo {
  episodeNumber: number;
  title: string;
  hasFile: boolean;
  audioLanguages: string[];
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

export type DetailItem = SeasonDetailItem | MovieDetailItem;

// --- Panel component ---

interface DetailPanelProps {
  item: DetailItem | null;
  onClose: () => void;
  onDismiss?: (mediaId: string, title: string) => void;
}

export function DetailPanel({ item, onClose, onDismiss }: DetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  // Swipe-to-dismiss on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    // Only allow swiping right (positive delta)
    touchDeltaX.current = Math.max(0, delta);
    if (panelRef.current && touchDeltaX.current > 0) {
      panelRef.current.style.transform = `translateX(${touchDeltaX.current}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (panelRef.current) {
      if (touchDeltaX.current > 100) {
        // Swipe threshold met — close
        onClose();
      } else {
        // Snap back
        panelRef.current.style.transform = "";
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  }, [onClose]);

  const handleDismiss = useCallback(() => {
    if (!item || !onDismiss) return;

    const mediaId = item.type === "season"
      ? `${item.seriesId}-s${item.seasonNumber}`
      : item.id;
    const title = item.type === "season"
      ? `${item.seriesTitle} S${item.seasonNumber}`
      : item.title;

    onDismiss(mediaId, title);
    onClose();
  }, [item, onDismiss, onClose]);

  const panelTitle = item
    ? item.type === "season"
      ? `${item.seriesTitle} — Season ${item.seasonNumber}`
      : item.title
    : "Details";

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
              ) : (
                <MovieDetail item={item} />
              )}
            </div>

            {/* Footer — Dismiss button */}
            {onDismiss && !item.dismissed && (
              <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
                <Button
                  variant="outline"
                  className="w-full text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDismiss}
                >
                  <EyeOff className="h-4 w-4" />
                  Dismiss
                </Button>
              </div>
            )}
            {item.dismissed && (
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
      <p className="text-xs text-muted-foreground">
        {item.availableEpisodes}/{item.totalEpisodes} episodes available
      </p>

      {/* Rule results */}
      <RuleResultsList results={item.verdict.ruleResults} />

      {/* Episode list */}
      {item.episodes.length > 0 && (
        <section>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Episodes
          </h4>
          <div className="space-y-1">
            {item.episodes.map((ep) => (
              <div
                key={ep.episodeNumber}
                className="flex items-center gap-3 rounded-md border border-border/50 bg-surface px-3 py-2"
              >
                <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground">
                  {String(ep.episodeNumber).padStart(2, "0")}
                </span>
                {ep.hasFile ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {ep.title}
                </span>
                {ep.audioLanguages.length > 0 && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {ep.audioLanguages.slice(0, 2).join(", ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
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
