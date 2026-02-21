import { describe, it, expect } from "vitest";
import { fullyMonitoredRule } from "./fully-monitored";
import type { Season } from "@/lib/models/media";
import type { RuleContext } from "./types";
import type { RulesConfig } from "@/lib/config/rules";

const defaultContext: RuleContext = {
  config: {
    rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
    languageTarget: "English",
    almostReadyThreshold: 0.8,
    compositionMode: "and",
    overrides: {},
  } as RulesConfig,
};

function makeEpisode(
  num: number,
  isMonitored: boolean | null
): Season["episodes"][0] {
  return {
    id: `ep${num}`,
    title: `Episode ${num}`,
    seasonNumber: 1,
    episodeNumber: num,
    hasFile: true,
    hasAired: true,
    isMonitored,
    isWatched: false,
    playbackProgress: null,
    lastPlayed: null,
    audioStreams: [],
    subtitleStreams: [],
  };
}

function makeSeason(episodes: Season["episodes"]): Season {
  return {
    seasonNumber: 1,
    title: "Season 1",
    totalEpisodes: episodes.length,
    availableEpisodes: episodes.length,
    airedEpisodes: episodes.length,
    episodes,
  };
}

describe("fullyMonitoredRule", () => {
  it("passes when all episodes are monitored", () => {
    const season = makeSeason([
      makeEpisode(1, true),
      makeEpisode(2, true),
      makeEpisode(3, true),
    ]);
    const result = fullyMonitoredRule(season, defaultContext);
    expect(result.passed).toBe(true);
    expect(result.numerator).toBe(3);
    expect(result.denominator).toBe(3);
  });

  it("fails when some episodes are not monitored", () => {
    const season = makeSeason([
      makeEpisode(1, true),
      makeEpisode(2, false),
      makeEpisode(3, true),
    ]);
    const result = fullyMonitoredRule(season, defaultContext);
    expect(result.passed).toBe(false);
    expect(result.numerator).toBe(2);
    expect(result.denominator).toBe(3);
  });

  it("passes (skips) when no monitoring data is available (Sonarr not configured)", () => {
    const season = makeSeason([
      makeEpisode(1, null),
      makeEpisode(2, null),
    ]);
    const result = fullyMonitoredRule(season, defaultContext);
    expect(result.passed).toBe(true);
    expect(result.detail).toContain("Sonarr not configured");
  });
});
