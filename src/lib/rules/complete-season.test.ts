import { describe, it, expect } from "vitest";
import { completeSeasonRule } from "./complete-season";
import type { Season } from "@/lib/models/media";
import type { RuleContext } from "./types";
import type { RulesConfig } from "@/lib/config/rules";

function makeSeason(overrides: Partial<Season> = {}): Season {
  return {
    seasonNumber: 1,
    title: "Season 1",
    totalEpisodes: 3,
    availableEpisodes: 3,
    airedEpisodes: 3,
    episodes: [
      {
        id: "ep1",
        title: "Episode 1",
        seasonNumber: 1,
        episodeNumber: 1,
        hasFile: true,
        hasAired: true,
        airDateUtc: null,
        isMonitored: null,
        isWatched: false,
        playbackProgress: null,
        lastPlayed: null,
        audioStreams: [],
        subtitleStreams: [],
      },
      {
        id: "ep2",
        title: "Episode 2",
        seasonNumber: 1,
        episodeNumber: 2,
        hasFile: true,
        hasAired: true,
        airDateUtc: null,
        isMonitored: null,
        isWatched: false,
        playbackProgress: null,
        lastPlayed: null,
        audioStreams: [],
        subtitleStreams: [],
      },
      {
        id: "ep3",
        title: "Episode 3",
        seasonNumber: 1,
        episodeNumber: 3,
        hasFile: true,
        hasAired: true,
        airDateUtc: null,
        isMonitored: null,
        isWatched: false,
        playbackProgress: null,
        lastPlayed: null,
        audioStreams: [],
        subtitleStreams: [],
      },
    ],
    ...overrides,
  };
}

const defaultContext: RuleContext = {
  config: {
    rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
    languageTarget: "English",
    almostReadyThreshold: 0.8,
    compositionMode: "and",
    overrides: {},
  } as RulesConfig,
};

describe("completeSeasonRule", () => {
  it("passes when all episodes are aired and have files", () => {
    const season = makeSeason();
    const result = completeSeasonRule(season, defaultContext);
    expect(result.passed).toBe(true);
    expect(result.ruleName).toBe("complete-season");
    expect(result.numerator).toBe(3);
    expect(result.denominator).toBe(3);
    expect(result.compactDetail).toBe("");
  });

  it("fails when not all episodes have aired", () => {
    const season = makeSeason({
      episodes: [
        {
          id: "ep1", title: "Episode 1", seasonNumber: 1, episodeNumber: 1,
          hasFile: true, hasAired: true, airDateUtc: null, isMonitored: null, isWatched: false,
          playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
        },
        {
          id: "ep2", title: "Episode 2", seasonNumber: 1, episodeNumber: 2,
          hasFile: false, hasAired: false, airDateUtc: null, isMonitored: null, isWatched: false,
          playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
        },
      ],
    });
    const result = completeSeasonRule(season, defaultContext);
    expect(result.passed).toBe(false);
    expect(result.compactDetail).toBe("");
  });

  it("fails when all episodes aired but some missing files", () => {
    const season = makeSeason({
      episodes: [
        {
          id: "ep1", title: "Episode 1", seasonNumber: 1, episodeNumber: 1,
          hasFile: true, hasAired: true, airDateUtc: null, isMonitored: null, isWatched: false,
          playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
        },
        {
          id: "ep2", title: "Episode 2", seasonNumber: 1, episodeNumber: 2,
          hasFile: false, hasAired: true, airDateUtc: null, isMonitored: null, isWatched: false,
          playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
        },
        {
          id: "ep3", title: "Episode 3", seasonNumber: 1, episodeNumber: 3,
          hasFile: true, hasAired: true, airDateUtc: null, isMonitored: null, isWatched: false,
          playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
        },
      ],
    });
    const result = completeSeasonRule(season, defaultContext);
    expect(result.passed).toBe(false);
    expect(result.numerator).toBe(2);
    expect(result.denominator).toBe(3);
    expect(result.compactDetail).toBe("");
  });

  it("reports correct progress for partially complete season", () => {
    const season = makeSeason({
      totalEpisodes: 4,
      episodes: [
        {
          id: "ep1", title: "Episode 1", seasonNumber: 1, episodeNumber: 1,
          hasFile: true, hasAired: true, airDateUtc: null, isMonitored: null, isWatched: false,
          playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
        },
        {
          id: "ep2", title: "Episode 2", seasonNumber: 1, episodeNumber: 2,
          hasFile: true, hasAired: true, airDateUtc: null, isMonitored: null, isWatched: false,
          playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
        },
        {
          id: "ep3", title: "Episode 3", seasonNumber: 1, episodeNumber: 3,
          hasFile: true, hasAired: true, airDateUtc: null, isMonitored: null, isWatched: false,
          playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
        },
        {
          id: "ep4", title: "Episode 4", seasonNumber: 1, episodeNumber: 4,
          hasFile: false, hasAired: true, airDateUtc: null, isMonitored: null, isWatched: false,
          playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
        },
      ],
    });
    const result = completeSeasonRule(season, defaultContext);
    expect(result.passed).toBe(false);
    expect(result.numerator).toBe(3);
    expect(result.denominator).toBe(4);
  });

  it("fails when season has 0 total episodes", () => {
    const season = makeSeason({
      totalEpisodes: 0,
      availableEpisodes: 0,
      airedEpisodes: 0,
      episodes: [],
    });
    const result = completeSeasonRule(season, defaultContext);
    expect(result.passed).toBe(false);
    expect(result.detail).toBe("No episodes in season");
    expect(result.numerator).toBe(0);
    expect(result.denominator).toBe(0);
  });
});
