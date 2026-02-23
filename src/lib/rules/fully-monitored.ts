import type { Season } from "@/lib/models/media";
import type { RuleResult } from "@/lib/models/readiness";
import type { RuleContext } from "./types";

export const RULE_NAME = "fully-monitored";

export function fullyMonitoredRule(
  season: Season,
  _context: RuleContext
): RuleResult {
  // If no episode has monitoring data (Sonarr not configured), skip
  const hasMonitoringData = season.episodes.some(
    (e) => e.isMonitored !== null
  );

  if (!hasMonitoringData) {
    return {
      ruleName: RULE_NAME,
      passed: true,
      detail: "Sonarr not configured, rule skipped",
      compactDetail: "",
      numerator: season.episodes.length,
      denominator: season.episodes.length,
    };
  }

  const monitored = season.episodes.filter(
    (e) => e.isMonitored === true
  ).length;
  const total = season.episodes.length;
  const passed = monitored >= total;

  return {
    ruleName: RULE_NAME,
    passed,
    detail: passed
      ? `All ${total} episodes monitored`
      : `${monitored}/${total} episodes monitored`,
    compactDetail: passed
      ? "monitored"
      : `${monitored}/${total} monitored`,
    numerator: monitored,
    denominator: total,
  };
}
