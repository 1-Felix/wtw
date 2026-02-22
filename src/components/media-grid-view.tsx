"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SeasonCard, SeriesGroupCard, MovieCard } from "@/components/media-card";
import { SearchFilter } from "@/components/search-filter";
import { DetailPanel } from "@/components/detail-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  DetailItem,
  SeasonDetailItem,
  SeriesGroupDetailItem,
  MovieDetailItem,
  EpisodeInfo,
} from "@/components/detail-panel";
import type { ReadinessVerdict } from "@/lib/models/readiness";
import { filterDismissedFromGroups } from "@/lib/series-grouping";

// --- Sort types ---

export interface SortOption {
  value: string;
  label: string;
}

export interface SortConfig {
  options: SortOption[];
  default: string;
}

// --- Comparator functions ---

type GridItem = SeasonItem | SeriesGroupItem | MovieItem;

function getTitle(item: GridItem): string {
  return "seriesTitle" in item ? item.seriesTitle : item.title;
}

function getDate(item: GridItem): number {
  return new Date(item.dateAdded).getTime();
}

function getProgress(item: GridItem): number {
  return item.verdict.progressPercent;
}

const comparators: Record<string, (a: GridItem, b: GridItem) => number> = {
  date: (a, b) => getDate(b) - getDate(a) || getTitle(a).localeCompare(getTitle(b)),
  title: (a, b) => getTitle(a).localeCompare(getTitle(b)) || getDate(b) - getDate(a),
  "title-desc": (a, b) => getTitle(b).localeCompare(getTitle(a)) || getDate(b) - getDate(a),
  progress: (a, b) => getProgress(b) - getProgress(a) || getTitle(a).localeCompare(getTitle(b)),
};

// --- Predefined sort configs ---

export const SORT_READY: SortConfig = {
  options: [
    { value: "date", label: "Date Added" },
    { value: "title", label: "Title A-Z" },
    { value: "title-desc", label: "Title Z-A" },
  ],
  default: "date",
};

export const SORT_ALMOST_READY: SortConfig = {
  options: [
    { value: "progress", label: "Progress" },
    { value: "title", label: "Title A-Z" },
    { value: "title-desc", label: "Title Z-A" },
    { value: "date", label: "Date Added" },
  ],
  default: "progress",
};

// --- Item types ---

export interface SeasonItem {
  seriesId: string;
  seriesTitle: string;
  seasonNumber: number;
  totalEpisodes: number;
  availableEpisodes: number;
  posterImageId: string | null;
  dateAdded: string;
  verdict: ReadinessVerdict;
  episodes?: EpisodeInfo[];
  watchedEpisodes?: number;
  lastPlayedAt?: string | null;
}

export interface SeriesGroupItem {
  seriesId: string;
  seriesTitle: string;
  posterImageId: string | null;
  dateAdded: string;
  seasons: SeasonItem[];
  seasonCount: number;
  verdict: ReadinessVerdict;
}

export function isSeriesGroup(
  item: SeasonItem | SeriesGroupItem
): item is SeriesGroupItem {
  return "seasons" in item;
}

export interface MovieItem {
  id: string;
  title: string;
  year: number | null;
  posterImageId: string | null;
  audioLanguages: string[];
  subtitleLanguages?: string[];
  dateAdded: string;
  verdict: ReadinessVerdict;
}

interface MediaGridViewProps {
  seasons: (SeasonItem | SeriesGroupItem)[];
  movies: MovieItem[];
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  sort?: SortConfig;
}

export function matchesQuery(title: string, query: string): boolean {
  return title.toLowerCase().includes(query.toLowerCase());
}

type TypeFilter = "all" | "series" | "movies";

export function MediaGridView({
  seasons,
  movies,
  emptyMessage,
  emptyAction,
  sort: sortConfig,
}: MediaGridViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize state from URL params
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [sortValue, setSortValue] = useState(() => {
    const param = searchParams.get("sort");
    if (param && sortConfig?.options.some((o) => o.value === param)) return param;
    return sortConfig?.default ?? "date";
  });
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(() => {
    const param = searchParams.get("type");
    if (param === "series" || param === "movies") return param;
    return "all";
  });
  const [selectedItem, setSelectedItem] = useState<DetailItem | null>(null);
  const [localDismissedIds, setLocalDismissedIds] = useState<Set<string>>(
    () => new Set()
  );

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sortConfig && sortValue !== sortConfig.default) params.set("sort", sortValue);
    if (typeFilter !== "all") params.set("type", typeFilter);

    const paramString = params.toString();
    const newUrl = paramString ? `?${paramString}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sortValue, typeFilter]);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSeasonClick = useCallback(
    (item: SeasonItem | SeriesGroupItem) => {
      if (isSeriesGroup(item)) {
        const detail: SeriesGroupDetailItem = {
          type: "series-group",
          seriesId: item.seriesId,
          seriesTitle: item.seriesTitle,
          posterImageId: item.posterImageId,
          seasons: item.seasons.map((s) => ({
            seriesId: s.seriesId,
            seriesTitle: s.seriesTitle,
            seasonNumber: s.seasonNumber,
            totalEpisodes: s.totalEpisodes,
            availableEpisodes: s.availableEpisodes,
            posterImageId: s.posterImageId,
            verdict: s.verdict,
            episodes: s.episodes ?? [],
            watchedEpisodes: s.watchedEpisodes ?? 0,
            lastPlayedAt: s.lastPlayedAt ?? null,
          })),
        };
        setSelectedItem(detail);
      } else {
        const detail: SeasonDetailItem = {
          type: "season",
          seriesId: item.seriesId,
          seriesTitle: item.seriesTitle,
          seasonNumber: item.seasonNumber,
          totalEpisodes: item.totalEpisodes,
          availableEpisodes: item.availableEpisodes,
          posterImageId: item.posterImageId,
          verdict: item.verdict,
          episodes: item.episodes ?? [],
          watchedEpisodes: item.watchedEpisodes ?? 0,
          lastPlayedAt: item.lastPlayedAt ?? null,
        };
        setSelectedItem(detail);
      }
    },
    []
  );

  const handleMovieClick = useCallback((movie: MovieItem) => {
    const detail: MovieDetailItem = {
      type: "movie",
      id: movie.id,
      title: movie.title,
      year: movie.year,
      posterImageId: movie.posterImageId,
      audioLanguages: movie.audioLanguages,
      subtitleLanguages: movie.subtitleLanguages ?? [],
      verdict: movie.verdict,
    };
    setSelectedItem(detail);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleDismiss = useCallback(
    (mediaId: string, title: string) => {
      // Check if this is a grouped series dismiss (mediaId is a seriesId)
      const groupItem = seasons.find(
        (s) => isSeriesGroup(s) && s.seriesId === mediaId
      );
      const isGroupDismiss = groupItem && isSeriesGroup(groupItem);

      // For groups, collect all individual season keys
      const dismissKeys = isGroupDismiss
        ? groupItem.seasons.map(
            (s) => `${groupItem.seriesId}-s${s.seasonNumber}`
          )
        : [mediaId];

      // Also add the group's seriesId to dismissed set so the group card hides
      const allIdsToHide = isGroupDismiss
        ? [mediaId, ...dismissKeys]
        : [mediaId];

      // Optimistically hide
      setLocalDismissedIds((prev) => {
        const next = new Set(prev);
        for (const id of allIdsToHide) next.add(id);
        return next;
      });

      // POST dismiss for each key
      const dismissPromises = dismissKeys.map((key) =>
        fetch(`/api/media/${key}/dismiss`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }).then((res) => {
          if (!res.ok) throw new Error("dismiss failed");
        })
      );

      Promise.all(dismissPromises).catch(() => {
        // Revert all on failure
        setLocalDismissedIds((prev) => {
          const next = new Set(prev);
          for (const id of allIdsToHide) next.delete(id);
          return next;
        });
        toast.error("Couldn't dismiss item — try again");
      });

      let undoInvoked = false;

      toast(`${title} dismissed`, {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            undoInvoked = true;

            // Restore locally
            setLocalDismissedIds((prev) => {
              const next = new Set(prev);
              for (const id of allIdsToHide) next.delete(id);
              return next;
            });

            // DELETE dismiss for each key
            const undoPromises = dismissKeys.map((key) =>
              fetch(`/api/media/${key}/dismiss`, { method: "DELETE" })
            );

            Promise.all(undoPromises)
              .then((responses) => {
                if (responses.every((r) => r.ok)) {
                  toast.success("Item restored");
                  router.refresh();
                } else {
                  // Undo failed — re-dismiss
                  setLocalDismissedIds((prev) => {
                    const next = new Set(prev);
                    for (const id of allIdsToHide) next.add(id);
                    return next;
                  });
                  toast.error("Couldn't restore item");
                }
              })
              .catch(() => {
                setLocalDismissedIds((prev) => {
                  const next = new Set(prev);
                  for (const id of allIdsToHide) next.add(id);
                  return next;
                });
                toast.error("Couldn't restore item");
              });
          },
        },
        onAutoClose: () => {
          if (!undoInvoked) router.refresh();
        },
        onDismiss: () => {
          if (!undoInvoked) router.refresh();
        },
      });
    },
    [router, seasons]
  );

  // Filter out dismissed items and re-evaluate groups.
  // If a group drops to 1 visible season it's unwrapped to a plain SeasonItem.
  const visibleSeasons = filterDismissedFromGroups(seasons, localDismissedIds);
  const visibleMovies = movies.filter(
    (m) => !localDismissedIds.has(m.id)
  );

  // Apply search filter
  const searchedSeasons = query
    ? visibleSeasons.filter((s) => matchesQuery(s.seriesTitle, query))
    : visibleSeasons;

  const searchedMovies = query
    ? visibleMovies.filter((m) => matchesQuery(m.title, query))
    : visibleMovies;

  // Apply sort
  const comparator = comparators[sortValue] ?? comparators.date;
  const sortedSeasons = [...searchedSeasons].sort(comparator);
  const sortedMovies = [...searchedMovies].sort(comparator);

  // Apply type filter
  const showSeasons = typeFilter !== "movies";
  const showMovies = typeFilter !== "series";

  const filteredSeasons = showSeasons ? sortedSeasons : [];
  const filteredMovies = showMovies ? sortedMovies : [];

  const hasData = seasons.length > 0 || movies.length > 0;
  const hasResults = filteredSeasons.length > 0 || filteredMovies.length > 0;

  if (!hasData) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SearchFilter ref={searchInputRef} query={query} onQueryChange={setQuery} />

        {/* Type filter toggle */}
        <div className="flex rounded-md border border-border">
          {(["all", "series", "movies"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                typeFilter === t
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              } ${t === "all" ? "rounded-l-md" : t === "movies" ? "rounded-r-md" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        {sortConfig && (
          <Select value={sortValue} onValueChange={setSortValue}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortConfig.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!hasResults && query && (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {!hasResults && !query && (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No {typeFilter === "series" ? "series" : typeFilter === "movies" ? "movies" : "items"} to show.
          </p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-8">
          {filteredSeasons.length > 0 && (
            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Series
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 tv:grid-cols-7 tv:gap-6">
                {filteredSeasons.map((item) =>
                  isSeriesGroup(item) ? (
                    <button
                      key={`group-${item.seriesId}`}
                      onClick={() => handleSeasonClick(item)}
                      className="cursor-pointer text-left"
                    >
                      <SeriesGroupCard
                        seriesTitle={item.seriesTitle}
                        seasonNumbers={item.seasons.map(
                          (s) => s.seasonNumber
                        )}
                        totalEpisodes={item.seasons.reduce(
                          (sum, s) => sum + s.totalEpisodes,
                          0
                        )}
                        availableEpisodes={item.seasons.reduce(
                          (sum, s) => sum + s.availableEpisodes,
                          0
                        )}
                        posterImageId={item.posterImageId}
                        verdict={item.verdict}
                      />
                    </button>
                  ) : (
                    <button
                      key={`${item.seriesId}-s${item.seasonNumber}`}
                      onClick={() => handleSeasonClick(item)}
                      className="cursor-pointer text-left"
                    >
                      <SeasonCard
                        seriesTitle={item.seriesTitle}
                        seasonNumber={item.seasonNumber}
                        totalEpisodes={item.totalEpisodes}
                        availableEpisodes={item.availableEpisodes}
                        posterImageId={item.posterImageId}
                        verdict={item.verdict}
                      />
                    </button>
                  )
                )}
              </div>
            </section>
          )}

          {filteredMovies.length > 0 && (
            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Movies
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 tv:grid-cols-7 tv:gap-6">
                {filteredMovies.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMovieClick(item)}
                    className="cursor-pointer text-left"
                  >
                    <MovieCard
                      title={item.title}
                      year={item.year}
                      posterImageId={item.posterImageId}
                      audioLanguages={item.audioLanguages}
                      verdict={item.verdict}
                    />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <DetailPanel
        item={selectedItem}
        onClose={handleClose}
        onDismiss={handleDismiss}
      />
    </>
  );
}
