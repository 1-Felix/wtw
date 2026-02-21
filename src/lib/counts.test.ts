import { describe, it, expect, vi } from "vitest";
import { getNavCounts } from "./counts";
import type { CacheData } from "./sync/cache";
import type { Series, Movie } from "./models/media";

// Mock the cache and evaluator
vi.mock("@/lib/sync/cache", () => ({
  getCache: vi.fn(() => mockCache),
}));

vi.mock("@/lib/rules/evaluator", () => ({
  evaluateSeason: vi.fn(
    (season: { seasonNumber: number }, _series: unknown) => {
      // Seasons 1-2 are ready, season 3 is almost-ready
      if (season.seasonNumber <= 2)
        return { status: "ready", ruleResults: [], progressPercent: 1 };
      return { status: "almost-ready", ruleResults: [], progressPercent: 0.8 };
    }
  ),
  evaluateMovie: vi.fn((movie: { id: string }) => {
    if (movie.id === "m1")
      return { status: "ready", ruleResults: [], progressPercent: 1 };
    return { status: "almost-ready", ruleResults: [], progressPercent: 0.7 };
  }),
}));

const makeSeason = (num: number) => ({
  seasonNumber: num,
  title: `Season ${num}`,
  totalEpisodes: 10,
  availableEpisodes: 10,
  airedEpisodes: 10,
  episodes: [
    {
      id: `ep${num}-1`,
      title: "Ep 1",
      seasonNumber: num,
      episodeNumber: 1,
      hasFile: true,
      hasAired: true,
      isMonitored: null,
      isWatched: false,
      playbackProgress: num === 1 ? 0.5 : null, // Season 1 ep 1 has progress
      lastPlayed: null,
      audioStreams: [],
      subtitleStreams: [],
    },
  ],
});

const mockCache: CacheData = {
  series: [
    {
      id: "s1",
      title: "Series 1",
      year: 2024,
      posterImageId: null,
      tvdbId: null,
      imdbId: null,
      dateAdded: "2024-01-01",
      languageProfile: null,
      inJellyfin: true,
      inSonarr: true,
      seasons: [makeSeason(1), makeSeason(2), makeSeason(3)],
    } as Series,
  ],
  movies: [
    {
      id: "m1",
      title: "Movie 1",
      year: 2024,
      posterImageId: null,
      tmdbId: null,
      imdbId: null,
      dateAdded: "2024-01-01",
      hasFile: true,
      isMonitored: true,
      isWatched: false,
      playbackProgress: 0.3, // In progress
      lastPlayed: null,
      audioStreams: [],
      subtitleStreams: [],
      inJellyfin: true,
      inRadarr: true,
    } as Movie,
    {
      id: "m2",
      title: "Movie 2",
      year: 2024,
      posterImageId: null,
      tmdbId: null,
      imdbId: null,
      dateAdded: "2024-01-01",
      hasFile: true,
      isMonitored: true,
      isWatched: true, // Watched — excluded from counts
      playbackProgress: null,
      lastPlayed: null,
      audioStreams: [],
      subtitleStreams: [],
      inJellyfin: true,
      inRadarr: true,
    } as Movie,
    {
      id: "m3",
      title: "Movie 3",
      year: 2024,
      posterImageId: null,
      tmdbId: null,
      imdbId: null,
      dateAdded: "2024-01-01",
      hasFile: true,
      isMonitored: true,
      isWatched: false,
      playbackProgress: null,
      lastPlayed: null,
      audioStreams: [],
      subtitleStreams: [],
      inJellyfin: true,
      inRadarr: true,
    } as Movie,
  ],
  syncState: {
    phase: "idle",
    lastSyncStart: null,
    lastSyncEnd: null,
    services: {},
  } as CacheData["syncState"],
  lastJellyfinData: null,
  lastSonarrData: [],
  lastRadarrData: [],
};

describe("getNavCounts", () => {
  it("counts ready items (seasons 1,2 + movie m1)", () => {
    const counts = getNavCounts();
    // 2 ready seasons + 1 ready movie
    expect(counts.ready).toBe(3);
  });

  it("counts almost-ready items (season 3 + movie m3)", () => {
    const counts = getNavCounts();
    // 1 almost-ready season + 1 almost-ready movie (m2 is watched, excluded)
    expect(counts.almostReady).toBe(2);
  });

  it("counts continue items (in-progress episodes + in-progress movies)", () => {
    const counts = getNavCounts();
    // 1 episode with playbackProgress 0.5 + 1 movie with playbackProgress 0.3
    expect(counts.continue).toBe(2);
  });
});
