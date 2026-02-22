import { describe, it, expect } from "vitest";
import {
  groupSeasonsBySeries,
  filterDismissedFromGroups,
  formatSeasonSummary,
} from "./series-grouping";
import type {
  SeasonItem,
  SeriesGroupItem,
} from "@/components/media-grid-view";
import type { ReadinessVerdict } from "@/lib/models/readiness";

function makeVerdict(
  status: "ready" | "almost-ready",
  progressPercent: number
): ReadinessVerdict {
  return { status, ruleResults: [], progressPercent };
}

function makeSeason(
  seriesId: string,
  seriesTitle: string,
  seasonNumber: number,
  verdict?: ReadinessVerdict
): SeasonItem {
  return {
    seriesId,
    seriesTitle,
    seasonNumber,
    totalEpisodes: 12,
    availableEpisodes: 12,
    posterImageId: null,
    dateAdded: "2025-01-01",
    verdict: verdict ?? makeVerdict("ready", 1),
  };
}

describe("groupSeasonsBySeries", () => {
  it("returns empty array for empty input", () => {
    expect(groupSeasonsBySeries([])).toEqual([]);
  });

  it("passes through single-season series as plain SeasonItem", () => {
    const seasons = [makeSeason("s1", "Show A", 1)];
    const result = groupSeasonsBySeries(seasons);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(seasons[0]); // same reference, not wrapped
  });

  it("groups multiple seasons of the same series into SeriesGroupItem", () => {
    const seasons = [
      makeSeason("s1", "Show A", 1),
      makeSeason("s1", "Show A", 2),
      makeSeason("s1", "Show A", 3),
    ];
    const result = groupSeasonsBySeries(seasons);
    expect(result).toHaveLength(1);

    const group = result[0];
    expect("seasons" in group).toBe(true);
    if ("seasons" in group) {
      expect(group.seriesId).toBe("s1");
      expect(group.seriesTitle).toBe("Show A");
      expect(group.seasonCount).toBe(3);
      expect(group.seasons).toHaveLength(3);
      // Seasons should be sorted by seasonNumber
      expect(group.seasons.map((s) => s.seasonNumber)).toEqual([1, 2, 3]);
    }
  });

  it("handles mixed series — groups multi-season, passes through single", () => {
    const seasons = [
      makeSeason("s1", "Show A", 1),
      makeSeason("s2", "Show B", 1),
      makeSeason("s1", "Show A", 2),
    ];
    const result = groupSeasonsBySeries(seasons);
    expect(result).toHaveLength(2);

    // First item: Show A grouped (2 seasons)
    const groupA = result[0];
    expect("seasons" in groupA).toBe(true);
    if ("seasons" in groupA) {
      expect(groupA.seriesId).toBe("s1");
      expect(groupA.seasonCount).toBe(2);
    }

    // Second item: Show B single season
    const single = result[1];
    expect("seasons" in single).toBe(false);
    expect("seasonNumber" in single && single.seasonNumber).toBe(1);
  });

  it("averages progressPercent across grouped seasons", () => {
    const seasons = [
      makeSeason("s1", "Show A", 1, makeVerdict("almost-ready", 0.85)),
      makeSeason("s1", "Show A", 2, makeVerdict("almost-ready", 0.95)),
    ];
    const result = groupSeasonsBySeries(seasons);
    expect(result).toHaveLength(1);

    const group = result[0];
    expect("seasons" in group).toBe(true);
    if ("seasons" in group) {
      expect(group.verdict.status).toBe("almost-ready");
      expect(group.verdict.progressPercent).toBeCloseTo(0.9);
    }
  });

  it("uses first season's status for the group verdict", () => {
    const seasons = [
      makeSeason("s1", "Show A", 1, makeVerdict("ready", 1)),
      makeSeason("s1", "Show A", 2, makeVerdict("ready", 1)),
    ];
    const result = groupSeasonsBySeries(seasons);
    const group = result[0];
    expect("seasons" in group).toBe(true);
    if ("seasons" in group) {
      expect(group.verdict.status).toBe("ready");
    }
  });

  it("sorts seasons within a group by seasonNumber", () => {
    const seasons = [
      makeSeason("s1", "Show A", 3),
      makeSeason("s1", "Show A", 1),
      makeSeason("s1", "Show A", 2),
    ];
    const result = groupSeasonsBySeries(seasons);
    const group = result[0];
    expect("seasons" in group).toBe(true);
    if ("seasons" in group) {
      expect(group.seasons.map((s) => s.seasonNumber)).toEqual([1, 2, 3]);
    }
  });
});

describe("formatSeasonSummary", () => {
  it("returns empty string for empty input", () => {
    expect(formatSeasonSummary([])).toBe("");
  });

  it("returns singular form for one season", () => {
    expect(formatSeasonSummary([3])).toBe("Season 3");
  });

  it("formats two contiguous seasons as a range", () => {
    expect(formatSeasonSummary([1, 2])).toBe("Seasons 1-2");
  });

  it("formats contiguous range", () => {
    expect(formatSeasonSummary([1, 2, 3])).toBe("Seasons 1-3");
  });

  it("formats non-contiguous seasons as comma list", () => {
    expect(formatSeasonSummary([1, 3, 7])).toBe("Seasons 1, 3, 7");
  });

  it("formats mixed contiguous and non-contiguous", () => {
    expect(formatSeasonSummary([1, 2, 3, 5, 8])).toBe("Seasons 1-3, 5, 8");
  });

  it("handles unsorted input", () => {
    expect(formatSeasonSummary([3, 1, 2])).toBe("Seasons 1-3");
  });

  it("handles multiple separate ranges", () => {
    expect(formatSeasonSummary([1, 2, 5, 6, 7])).toBe("Seasons 1-2, 5-7");
  });
});

describe("filterDismissedFromGroups", () => {
  function makeGroup(
    seriesId: string,
    seriesTitle: string,
    seasonNumbers: number[]
  ): SeriesGroupItem {
    const seasons = seasonNumbers.map((n) =>
      makeSeason(seriesId, seriesTitle, n)
    );
    return {
      seriesId,
      seriesTitle,
      posterImageId: null,
      dateAdded: "2025-01-01",
      seasons,
      seasonCount: seasons.length,
      verdict: makeVerdict("ready", 1),
    };
  }

  it("returns items unchanged when nothing is dismissed", () => {
    const items = [
      makeGroup("s1", "Show A", [1, 2, 3]),
      makeSeason("s2", "Show B", 1),
    ];
    const result = filterDismissedFromGroups(items, new Set());
    expect(result).toHaveLength(2);
    expect("seasons" in result[0]).toBe(true);
  });

  it("removes a plain SeasonItem when its key is dismissed", () => {
    const items = [makeSeason("s1", "Show A", 2)];
    const result = filterDismissedFromGroups(items, new Set(["s1-s2"]));
    expect(result).toHaveLength(0);
  });

  it("removes an entire group when seriesId is dismissed", () => {
    const items = [makeGroup("s1", "Show A", [1, 2, 3])];
    const result = filterDismissedFromGroups(items, new Set(["s1"]));
    expect(result).toHaveLength(0);
  });

  it("unwraps group to plain SeasonItem when only 1 season remains", () => {
    const group = makeGroup("s1", "Show A", [1, 2, 3]);
    const dismissed = new Set(["s1-s1", "s1-s2"]); // dismiss seasons 1 and 2
    const result = filterDismissedFromGroups([group], dismissed);

    expect(result).toHaveLength(1);
    const item = result[0];
    // Should be a plain SeasonItem, not a group
    expect("seasons" in item).toBe(false);
    expect("seasonNumber" in item && item.seasonNumber).toBe(3);
  });

  it("shrinks a group when some seasons are dismissed", () => {
    const group = makeGroup("s1", "Show A", [1, 2, 3, 4]);
    const dismissed = new Set(["s1-s1"]); // dismiss season 1
    const result = filterDismissedFromGroups([group], dismissed);

    expect(result).toHaveLength(1);
    const item = result[0];
    expect("seasons" in item).toBe(true);
    if ("seasons" in item) {
      expect(item.seasonCount).toBe(3);
      expect(item.seasons.map((s) => s.seasonNumber)).toEqual([2, 3, 4]);
    }
  });

  it("removes group entirely when all seasons are individually dismissed", () => {
    const group = makeGroup("s1", "Show A", [1, 2]);
    const dismissed = new Set(["s1-s1", "s1-s2"]);
    const result = filterDismissedFromGroups([group], dismissed);
    expect(result).toHaveLength(0);
  });

  it("handles mixed groups and singles with partial dismissals", () => {
    const items = [
      makeGroup("s1", "Show A", [1, 2, 3]),
      makeSeason("s2", "Show B", 1),
      makeSeason("s3", "Show C", 1),
    ];
    const dismissed = new Set(["s1-s1", "s1-s2", "s3-s1"]);
    const result = filterDismissedFromGroups(items, dismissed);

    // s1 group: 3 seasons, 2 dismissed → unwrapped to plain SeasonItem (season 3)
    // s2: not dismissed → kept
    // s3: dismissed → removed
    expect(result).toHaveLength(2);

    const first = result[0];
    expect("seasons" in first).toBe(false);
    expect("seasonNumber" in first && first.seasonNumber).toBe(3);

    const second = result[1];
    expect("seasonNumber" in second && second.seasonNumber).toBe(1);
    expect("seriesId" in second && second.seriesId).toBe("s2");
  });

  it("recomputes verdict when group shrinks", () => {
    const group: SeriesGroupItem = {
      seriesId: "s1",
      seriesTitle: "Show A",
      posterImageId: null,
      dateAdded: "2025-01-01",
      seasons: [
        makeSeason("s1", "Show A", 1, makeVerdict("almost-ready", 0.8)),
        makeSeason("s1", "Show A", 2, makeVerdict("almost-ready", 0.9)),
        makeSeason("s1", "Show A", 3, makeVerdict("almost-ready", 1.0)),
      ],
      seasonCount: 3,
      verdict: makeVerdict("almost-ready", 0.9),
    };
    // Dismiss season 1 (0.8 progress) — remaining are 0.9 and 1.0
    const result = filterDismissedFromGroups([group], new Set(["s1-s1"]));

    expect(result).toHaveLength(1);
    const item = result[0];
    expect("seasons" in item).toBe(true);
    if ("seasons" in item) {
      expect(item.verdict.progressPercent).toBeCloseTo(0.95);
    }
  });
});
