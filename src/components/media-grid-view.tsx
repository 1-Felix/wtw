"use client";

import { useState, useCallback } from "react";
import { SeasonCard, MovieCard } from "@/components/media-card";
import { SearchFilter } from "@/components/search-filter";
import { DetailPanel } from "@/components/detail-panel";
import type { DetailItem, SeasonDetailItem, MovieDetailItem, EpisodeInfo } from "@/components/detail-panel";
import type { ReadinessVerdict } from "@/lib/models/readiness";

export interface SeasonItem {
  seriesId: string;
  seriesTitle: string;
  seasonNumber: number;
  totalEpisodes: number;
  availableEpisodes: number;
  posterImageId: string | null;
  dateAdded: string;
  verdict: ReadinessVerdict;
  /** Episode data for the detail panel */
  episodes?: EpisodeInfo[];
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
  seasons: SeasonItem[];
  movies: MovieItem[];
  emptyMessage: string;
  emptyAction?: React.ReactNode;
}

export function matchesQuery(title: string, query: string): boolean {
  return title.toLowerCase().includes(query.toLowerCase());
}

export function MediaGridView({
  seasons,
  movies,
  emptyMessage,
  emptyAction,
}: MediaGridViewProps) {
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<DetailItem | null>(null);

  const handleSeasonClick = useCallback((season: SeasonItem) => {
    const detail: SeasonDetailItem = {
      type: "season",
      seriesId: season.seriesId,
      seriesTitle: season.seriesTitle,
      seasonNumber: season.seasonNumber,
      totalEpisodes: season.totalEpisodes,
      availableEpisodes: season.availableEpisodes,
      posterImageId: season.posterImageId,
      verdict: season.verdict,
      episodes: season.episodes ?? [],
    };
    setSelectedItem(detail);
  }, []);

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

  const handleDismiss = useCallback((mediaId: string, _title: string) => {
    // Close the panel and remove the item from the local lists
    setSelectedItem(null);
    // Trigger a page refresh to re-fetch data with the dismissed item filtered out
    window.location.reload();
  }, []);

  const filteredSeasons = query
    ? seasons.filter((s) => matchesQuery(s.seriesTitle, query))
    : seasons;

  const filteredMovies = query
    ? movies.filter((m) => matchesQuery(m.title, query))
    : movies;

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
      <SearchFilter query={query} onQueryChange={setQuery} />

      {!hasResults && (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
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
                {filteredSeasons.map((item) => (
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
                ))}
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

      <DetailPanel item={selectedItem} onClose={handleClose} onDismiss={handleDismiss} />
    </>
  );
}
