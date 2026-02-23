import { describe, it, expect, beforeEach } from "vitest";
import { markItemWatched, getCache, updateMedia } from "./cache";
import type { Series, Movie } from "@/lib/models/media";

function makeEpisode(overrides: Partial<ReturnType<typeof baseEpisode>> = {}) {
  return { ...baseEpisode(), ...overrides };
}

function baseEpisode() {
  return {
    id: "ep-1",
    title: "Episode 1",
    seasonNumber: 1,
    episodeNumber: 1,
    hasFile: true,
    hasAired: true,
    airDateUtc: null,
    isMonitored: null,
    isWatched: false,
    playbackProgress: 0.5 as number | null,
    lastPlayed: "2026-01-01T00:00:00Z",
    audioStreams: [],
    subtitleStreams: [],
  };
}

function makeSeries(episodes: ReturnType<typeof makeEpisode>[]): Series {
  return {
    id: "series-1",
    title: "Test Series",
    year: 2026,
    posterImageId: null,
    tvdbId: null,
    imdbId: null,
    dateAdded: "2026-01-01T00:00:00Z",
    languageProfile: null,
    inJellyfin: true,
    inSonarr: true,
    seasons: [
      {
        seasonNumber: 1,
        title: "Season 1",
        totalEpisodes: episodes.length,
        availableEpisodes: episodes.length,
        airedEpisodes: episodes.length,
        episodes,
      },
    ],
  };
}

function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: "movie-1",
    title: "Test Movie",
    year: 2026,
    posterImageId: null,
    tmdbId: null,
    imdbId: null,
    dateAdded: "2026-01-01T00:00:00Z",
    hasFile: true,
    isMonitored: true,
    isWatched: false,
    playbackProgress: 0.3,
    lastPlayed: "2026-01-01T00:00:00Z",
    audioStreams: [],
    subtitleStreams: [],
    inJellyfin: true,
    inRadarr: true,
    ...overrides,
  };
}

beforeEach(() => {
  // Reset cache to empty
  updateMedia([], []);
});

describe("markItemWatched", () => {
  it("marks an episode as watched and clears playback progress", () => {
    const ep = makeEpisode({ id: "ep-1", isWatched: false, playbackProgress: 0.5 });
    updateMedia([makeSeries([ep])], []);

    const found = markItemWatched("ep-1", true);

    expect(found).toBe(true);
    const cache = getCache();
    const updated = cache.series[0].seasons[0].episodes[0];
    expect(updated.isWatched).toBe(true);
    expect(updated.playbackProgress).toBeNull();
  });

  it("marks a movie as watched and clears playback progress", () => {
    const movie = makeMovie({ id: "movie-1", isWatched: false, playbackProgress: 0.7 });
    updateMedia([], [movie]);

    const found = markItemWatched("movie-1", true);

    expect(found).toBe(true);
    const cache = getCache();
    expect(cache.movies[0].isWatched).toBe(true);
    expect(cache.movies[0].playbackProgress).toBeNull();
  });

  it("marks an episode as unwatched", () => {
    const ep = makeEpisode({ id: "ep-1", isWatched: true, playbackProgress: null });
    updateMedia([makeSeries([ep])], []);

    const found = markItemWatched("ep-1", false);

    expect(found).toBe(true);
    const cache = getCache();
    const updated = cache.series[0].seasons[0].episodes[0];
    expect(updated.isWatched).toBe(false);
  });

  it("marks a movie as unwatched", () => {
    const movie = makeMovie({ id: "movie-1", isWatched: true, playbackProgress: null });
    updateMedia([], [movie]);

    const found = markItemWatched("movie-1", false);

    expect(found).toBe(true);
    const cache = getCache();
    expect(cache.movies[0].isWatched).toBe(false);
  });

  it("returns false when item is not found", () => {
    updateMedia([], []);

    const found = markItemWatched("nonexistent-id", true);

    expect(found).toBe(false);
  });

  it("preserves playback progress when marking as unwatched", () => {
    const ep = makeEpisode({ id: "ep-1", isWatched: false, playbackProgress: 0.6 });
    updateMedia([makeSeries([ep])], []);

    // First mark as watched (clears progress)
    markItemWatched("ep-1", true);
    // Then mark as unwatched (should not restore progress)
    markItemWatched("ep-1", false);

    const cache = getCache();
    const updated = cache.series[0].seasons[0].episodes[0];
    expect(updated.isWatched).toBe(false);
    expect(updated.playbackProgress).toBeNull();
  });
});
