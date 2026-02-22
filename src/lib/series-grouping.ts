import type {
  SeasonItem,
  SeriesGroupItem,
} from "@/components/media-grid-view";
import type { ReadinessVerdict } from "@/lib/models/readiness";

/**
 * Groups seasons by series. When a series has 2+ seasons in the list,
 * they are collapsed into a single `SeriesGroupItem`. Series with
 * exactly 1 season remain as plain `SeasonItem`.
 */
export function groupSeasonsBySeries(
  seasons: SeasonItem[]
): (SeasonItem | SeriesGroupItem)[] {
  // Group by seriesId, preserving insertion order
  const grouped = new Map<string, SeasonItem[]>();
  for (const season of seasons) {
    const existing = grouped.get(season.seriesId);
    if (existing) {
      existing.push(season);
    } else {
      grouped.set(season.seriesId, [season]);
    }
  }

  const result: (SeasonItem | SeriesGroupItem)[] = [];

  for (const seriesSeasons of grouped.values()) {
    if (seriesSeasons.length === 1) {
      result.push(seriesSeasons[0]);
    } else {
      // Sort seasons by seasonNumber within the group
      const sorted = [...seriesSeasons].sort(
        (a, b) => a.seasonNumber - b.seasonNumber
      );

      const first = sorted[0];
      result.push({
        seriesId: first.seriesId,
        seriesTitle: first.seriesTitle,
        posterImageId: first.posterImageId,
        dateAdded: first.dateAdded,
        seasons: sorted,
        seasonCount: sorted.length,
        verdict: computeGroupVerdict(sorted),
      });
    }
  }

  return result;
}

/**
 * Computes a representative verdict for a group of seasons.
 * Status is taken from the first season (all share the same status
 * within a view). Progress is the average across all seasons.
 */
function computeGroupVerdict(seasons: SeasonItem[]): ReadinessVerdict {
  const first = seasons[0];
  const avgProgress =
    seasons.reduce((sum, s) => sum + s.verdict.progressPercent, 0) /
    seasons.length;

  return {
    status: first.verdict.status,
    ruleResults: first.verdict.ruleResults,
    progressPercent: avgProgress,
  };
}

/**
 * Filters dismissed seasons from grouped items and re-evaluates groups.
 * If a group drops to 1 visible season, it's unwrapped back to a plain
 * `SeasonItem`. If all seasons are dismissed, the group is removed.
 *
 * For ungrouped `SeasonItem` entries, filters by their dismiss key.
 */
export function filterDismissedFromGroups(
  items: (SeasonItem | SeriesGroupItem)[],
  dismissedIds: Set<string>
): (SeasonItem | SeriesGroupItem)[] {
  const result: (SeasonItem | SeriesGroupItem)[] = [];

  for (const item of items) {
    if (!("seasons" in item)) {
      // Plain SeasonItem — filter by its dismiss key
      const key = `${item.seriesId}-s${item.seasonNumber}`;
      if (!dismissedIds.has(key)) {
        result.push(item);
      }
      continue;
    }

    // SeriesGroupItem — check if the whole group is dismissed
    if (dismissedIds.has(item.seriesId)) continue;

    // Filter individual seasons within the group
    const visibleSeasons = item.seasons.filter((s) => {
      const key = `${s.seriesId}-s${s.seasonNumber}`;
      return !dismissedIds.has(key);
    });

    if (visibleSeasons.length === 0) {
      // All seasons dismissed — remove group
      continue;
    } else if (visibleSeasons.length === 1) {
      // Only 1 season left — unwrap to plain SeasonItem
      result.push(visibleSeasons[0]);
    } else {
      // Still a valid group — rebuild with updated seasons/verdict
      const sorted = [...visibleSeasons].sort(
        (a, b) => a.seasonNumber - b.seasonNumber
      );
      const first = sorted[0];
      result.push({
        seriesId: first.seriesId,
        seriesTitle: first.seriesTitle,
        posterImageId: first.posterImageId,
        dateAdded: first.dateAdded,
        seasons: sorted,
        seasonCount: sorted.length,
        verdict: computeGroupVerdict(sorted),
      });
    }
  }

  return result;
}

/**
 * Formats a list of season numbers into a human-readable summary.
 *
 * - Contiguous: [1, 2, 3] → "Seasons 1-3"
 * - Non-contiguous: [1, 3, 7] → "Seasons 1, 3, 7"
 * - Mixed: [1, 2, 3, 5, 8] → "Seasons 1-3, 5, 8"
 */
export function formatSeasonSummary(seasonNumbers: number[]): string {
  if (seasonNumbers.length === 0) return "";
  if (seasonNumbers.length === 1) return `Season ${seasonNumbers[0]}`;

  const sorted = [...seasonNumbers].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }
  ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);

  return `Seasons ${ranges.join(", ")}`;
}
