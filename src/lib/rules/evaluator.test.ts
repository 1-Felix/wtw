import { describe, it, expect, vi, afterEach } from "vitest";
import { evaluateSeason, evaluateMovie } from "./evaluator";
import type { Season, Series, Movie } from "@/lib/models/media";
import * as rulesConfig from "@/lib/config/rules";

// Mock the config module
vi.mock("@/lib/config/rules", () => ({
  getRulesConfig: vi.fn(() => ({
    rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
    languageTarget: "English",
    almostReadyThreshold: 0.8,
    compositionMode: "and" as const,
    overrides: {},
    hideWatched: true,
  })),
  getSeriesOverride: vi.fn(() => undefined),
}));

afterEach(() => {
  vi.mocked(rulesConfig.getRulesConfig).mockReturnValue({
    rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
    languageTarget: "English",
    almostReadyThreshold: 0.8,
    compositionMode: "and" as const,
    overrides: {},
    hideWatched: true,
  });
});

function makeEpisode(
  num: number,
  opts: { hasFile?: boolean; hasAired?: boolean; audioLang?: string } = {}
): Season["episodes"][0] {
  const { hasFile = true, hasAired = true, audioLang = "English" } = opts;
  return {
    id: `ep${num}`,
    title: `Episode ${num}`,
    seasonNumber: 1,
    episodeNumber: num,
    hasFile,
    hasAired,
    isMonitored: null,
    isWatched: false,
    playbackProgress: null,
    lastPlayed: null,
    audioStreams: audioLang ? [{ language: audioLang, isDefault: true }] : [],
    subtitleStreams: [],
  };
}

function makeSeries(seasons: Season[]): Series {
  return {
    id: "s1",
    title: "Test Series",
    year: 2024,
    posterImageId: null,
    tvdbId: null,
    imdbId: null,
    dateAdded: "2024-01-01",
    seasons,
    languageProfile: null,
    inJellyfin: true,
    inSonarr: false,
  };
}

describe("evaluateSeason", () => {

  it("returns 'ready' when all rules pass", () => {
    const season: Season = {
      seasonNumber: 1,
      title: "Season 1",
      totalEpisodes: 2,
      availableEpisodes: 2,
      airedEpisodes: 2,
      episodes: [makeEpisode(1), makeEpisode(2)],
    };
    const series = makeSeries([season]);
    const verdict = evaluateSeason(season, series);
    expect(verdict.status).toBe("ready");
    expect(verdict.progressPercent).toBe(1);
  });

  it("returns 'not-ready' when episodes are not all aired", () => {
    const season: Season = {
      seasonNumber: 1,
      title: "Season 1",
      totalEpisodes: 3,
      availableEpisodes: 1,
      airedEpisodes: 1,
      episodes: [
        makeEpisode(1),
        makeEpisode(2, { hasFile: false, hasAired: false }),
        makeEpisode(3, { hasFile: false, hasAired: false }),
      ],
    };
    const series = makeSeries([season]);
    const verdict = evaluateSeason(season, series);
    expect(verdict.status).not.toBe("ready");
  });

  it("returns 'almost-ready' when progress meets threshold but not all rules pass", () => {
    const season: Season = {
      seasonNumber: 1,
      title: "Season 1",
      totalEpisodes: 10,
      availableEpisodes: 9,
      airedEpisodes: 10,
      episodes: [
        ...Array.from({ length: 9 }, (_, i) => makeEpisode(i + 1)),
        makeEpisode(10, { hasFile: false }),
      ],
    };
    const series = makeSeries([season]);
    const verdict = evaluateSeason(season, series);
    expect(verdict.status).toBe("almost-ready");
    expect(verdict.progressPercent).toBeGreaterThanOrEqual(0.8);
    expect(verdict.progressPercent).toBeLessThan(1);
  });

  it("uses custom almostReadyThreshold from config", () => {
    // Only enable completeSeason so progress = 9/10 = 0.9 exactly
    vi.mocked(rulesConfig.getRulesConfig).mockReturnValue({
      rules: { completeSeason: true, languageAvailable: false, fullyMonitored: false },
      languageTarget: "English",
      almostReadyThreshold: 0.95,
      compositionMode: "and" as const,
      overrides: {},
      hideWatched: true,
    });

    // 9/10 episodes = 0.9 progress, below 0.95 threshold
    const season: Season = {
      seasonNumber: 1,
      title: "Season 1",
      totalEpisodes: 10,
      availableEpisodes: 9,
      airedEpisodes: 10,
      episodes: [
        ...Array.from({ length: 9 }, (_, i) => makeEpisode(i + 1)),
        makeEpisode(10, { hasFile: false }),
      ],
    };
    const series = makeSeries([season]);
    const verdict = evaluateSeason(season, series);
    // 0.9 < 0.95 threshold, so should be not-ready instead of almost-ready
    expect(verdict.status).toBe("not-ready");
  });

  it("skips rules listed in per-series disabledRules override", () => {
    vi.mocked(rulesConfig.getSeriesOverride).mockReturnValue({
      disabledRules: ["complete-season"],
    });

    // Season is incomplete but complete-season rule is disabled
    const season: Season = {
      seasonNumber: 1,
      title: "Season 1",
      totalEpisodes: 3,
      availableEpisodes: 1,
      airedEpisodes: 3,
      episodes: [
        makeEpisode(1),
        makeEpisode(2, { hasFile: false }),
        makeEpisode(3, { hasFile: false }),
      ],
    };
    const series = makeSeries([season]);
    const verdict = evaluateSeason(season, series);
    // complete-season skipped; language + monitored should pass
    expect(verdict.status).toBe("ready");
    // Should not include a complete-season result
    const ruleNames = verdict.ruleResults.map((r) => r.ruleName);
    expect(ruleNames).not.toContain("complete-season");

    vi.mocked(rulesConfig.getSeriesOverride).mockReturnValue(undefined);
  });

  it("uses 'or' composition mode — passes if any rule passes", () => {
    vi.mocked(rulesConfig.getRulesConfig).mockReturnValue({
      rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
      languageTarget: "English",
      almostReadyThreshold: 0.8,
      compositionMode: "or" as const,
      overrides: {},
      hideWatched: true,
    });

    // Season with wrong language but complete episodes
    const season: Season = {
      seasonNumber: 1,
      title: "Season 1",
      totalEpisodes: 2,
      availableEpisodes: 2,
      airedEpisodes: 2,
      episodes: [
        makeEpisode(1, { audioLang: "Japanese" }),
        makeEpisode(2, { audioLang: "Japanese" }),
      ],
    };
    const series = makeSeries([season]);
    const verdict = evaluateSeason(season, series);
    // In "or" mode, complete-season passes so overall should be ready
    expect(verdict.status).toBe("ready");
  });

  it("returns 'ready' with no rule results when no rules are enabled", () => {
    // Override mock with all rules disabled
    vi.mocked(rulesConfig.getRulesConfig).mockReturnValue({
      rules: { completeSeason: false, languageAvailable: false, fullyMonitored: false },
      languageTarget: "English",
      almostReadyThreshold: 0.8,
      compositionMode: "and" as const,
      overrides: {},
      hideWatched: true,
    });

    const season: Season = {
      seasonNumber: 1,
      title: "Season 1",
      totalEpisodes: 2,
      availableEpisodes: 0,
      airedEpisodes: 0,
      episodes: [
        makeEpisode(1, { hasFile: false, hasAired: false }),
        makeEpisode(2, { hasFile: false, hasAired: false }),
      ],
    };
    const series = makeSeries([season]);
    const verdict = evaluateSeason(season, series);
    expect(verdict.status).toBe("ready");
    expect(verdict.ruleResults).toHaveLength(0);
  });
});

describe("evaluateMovie", () => {
  it("returns 'ready' when movie has target language", () => {
    const movie: Movie = {
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
    };
    const verdict = evaluateMovie(movie);
    expect(verdict.status).toBe("ready");
  });

  it("returns 'not-ready' when movie lacks target language", () => {
    const movie: Movie = {
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
    };
    const verdict = evaluateMovie(movie);
    expect(verdict.status).toBe("not-ready");
  });
});
