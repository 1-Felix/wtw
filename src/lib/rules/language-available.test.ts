import { describe, it, expect } from "vitest";
import { languageAvailableSeasonRule, languageAvailableMovieRule } from "./language-available";
import type { Season, Movie } from "@/lib/models/media";
import type { RuleContext } from "./types";
import type { RulesConfig } from "@/lib/config/rules";

const defaultConfig: RulesConfig = {
  rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
  languageTarget: "English",
  almostReadyThreshold: 0.8,
  compositionMode: "and",
  overrides: {},
} as RulesConfig;

const defaultContext: RuleContext = { config: defaultConfig };

function makeSeason(episodes: Season["episodes"]): Season {
  return {
    seasonNumber: 1,
    title: "Season 1",
    totalEpisodes: episodes.length,
    availableEpisodes: episodes.filter((e) => e.hasFile).length,
    airedEpisodes: episodes.filter((e) => e.hasAired).length,
    episodes,
  };
}

function makeEpisode(
  num: number,
  audioLangs: string[],
  hasFile = true
): Season["episodes"][0] {
  return {
    id: `ep${num}`,
    title: `Episode ${num}`,
    seasonNumber: 1,
    episodeNumber: num,
    hasFile,
    hasAired: true,
    airDateUtc: null,
    isMonitored: null,
    isWatched: false,
    playbackProgress: null,
    lastPlayed: null,
    audioStreams: audioLangs.map((lang) => ({ language: lang, isDefault: false })),
    subtitleStreams: [],
  };
}

describe("languageAvailableSeasonRule", () => {
  it("passes when all episodes have the target language", () => {
    const season = makeSeason([
      makeEpisode(1, ["English", "Japanese"]),
      makeEpisode(2, ["English"]),
    ]);
    const result = languageAvailableSeasonRule(season, defaultContext);
    expect(result.passed).toBe(true);
    expect(result.numerator).toBe(2);
    expect(result.denominator).toBe(2);
    expect(result.compactDetail).toBe("eng audio");
  });

  it("fails when some episodes lack the target language", () => {
    const season = makeSeason([
      makeEpisode(1, ["English"]),
      makeEpisode(2, ["Japanese"]),
    ]);
    const result = languageAvailableSeasonRule(season, defaultContext);
    expect(result.passed).toBe(false);
    expect(result.numerator).toBe(1);
    expect(result.denominator).toBe(2);
    expect(result.compactDetail).toBe("1/2 eng audio");
  });

  it("treats episodes with no audio streams optimistically", () => {
    const season = makeSeason([
      makeEpisode(1, []),
      makeEpisode(2, ["English"]),
    ]);
    const result = languageAvailableSeasonRule(season, defaultContext);
    expect(result.passed).toBe(true);
  });

  it("skips episodes without files", () => {
    const season = makeSeason([
      makeEpisode(1, ["English"]),
      makeEpisode(2, ["Japanese"], false),
    ]);
    const result = languageAvailableSeasonRule(season, defaultContext);
    expect(result.passed).toBe(true);
    expect(result.denominator).toBe(1);
  });

  it("uses series override language target", () => {
    const context: RuleContext = {
      config: defaultConfig,
      seriesOverride: { languageTarget: "Japanese" },
    };
    const season = makeSeason([
      makeEpisode(1, ["Japanese"]),
      makeEpisode(2, ["Japanese"]),
    ]);
    const result = languageAvailableSeasonRule(season, context);
    expect(result.passed).toBe(true);
    expect(result.compactDetail).toBe("jpn audio");
  });

  it("is case-insensitive for language matching", () => {
    const season = makeSeason([
      makeEpisode(1, ["english"]),
    ]);
    const result = languageAvailableSeasonRule(season, defaultContext);
    expect(result.passed).toBe(true);
  });
});

describe("languageAvailableMovieRule", () => {
  it("passes when movie has target language audio", () => {
    const movie = {
      id: "m1",
      title: "Test Movie",
      year: 2024,
      posterImageId: null,
      tmdbId: null,
      imdbId: null,
      dateAdded: "2024-01-01",
      hasFile: true,
      isMonitored: null,
      isWatched: false,
      playbackProgress: null,
      lastPlayed: null,
      audioStreams: [{ language: "English", isDefault: true }],
      subtitleStreams: [],
      inJellyfin: true,
      inRadarr: false,
    } satisfies Movie;

    const result = languageAvailableMovieRule(movie, defaultContext);
    expect(result.passed).toBe(true);
    expect(result.compactDetail).toBe("eng audio");
  });

  it("fails when movie lacks target language", () => {
    const movie = {
      id: "m1",
      title: "Test Movie",
      year: 2024,
      posterImageId: null,
      tmdbId: null,
      imdbId: null,
      dateAdded: "2024-01-01",
      hasFile: true,
      isMonitored: null,
      isWatched: false,
      playbackProgress: null,
      lastPlayed: null,
      audioStreams: [{ language: "Japanese", isDefault: true }],
      subtitleStreams: [],
      inJellyfin: true,
      inRadarr: false,
    } satisfies Movie;

    const result = languageAvailableMovieRule(movie, defaultContext);
    expect(result.passed).toBe(false);
    expect(result.compactDetail).toBe("eng audio not available");
  });

  it("passes optimistically when no audio streams exist", () => {
    const movie = {
      id: "m1",
      title: "Test Movie",
      year: 2024,
      posterImageId: null,
      tmdbId: null,
      imdbId: null,
      dateAdded: "2024-01-01",
      hasFile: true,
      isMonitored: null,
      isWatched: false,
      playbackProgress: null,
      lastPlayed: null,
      audioStreams: [],
      subtitleStreams: [],
      inJellyfin: true,
      inRadarr: false,
    } satisfies Movie;

    const result = languageAvailableMovieRule(movie, defaultContext);
    expect(result.passed).toBe(true);
    expect(result.compactDetail).toBe("eng audio");
  });
});
