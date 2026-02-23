import type { Season } from "@/lib/models/media";
import type { RuleResult } from "@/lib/models/readiness";
import type { RuleContext } from "./types";

export const RULE_NAME = "complete-season";

export function completeSeasonRule(
  season: Season,
  _context: RuleContext
): RuleResult {
  const totalExpected = season.totalEpisodes;
  const available = season.episodes.filter((e) => e.hasFile).length;
  const allAired = season.episodes.every((e) => e.hasAired);

  // If not all episodes have aired, season is not complete
  if (!allAired) {
    const aired = season.episodes.filter((e) => e.hasAired).length;
    return {
      ruleName: RULE_NAME,
      passed: false,
      detail: `${aired}/${totalExpected} episodes aired, ${available} available`,
      compactDetail: "",
      numerator: available,
      denominator: totalExpected,
    };
  }

  const passed = available >= totalExpected;

  return {
    ruleName: RULE_NAME,
    passed,
    detail: passed
      ? `All ${totalExpected} episodes available`
      : `${available}/${totalExpected} episodes available`,
    compactDetail: "",
    numerator: available,
    denominator: totalExpected,
  };
}
