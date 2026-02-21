import type { Season, Series, Movie } from "@/lib/models/media";
import type { ReadinessVerdict, RuleResult } from "@/lib/models/readiness";
import type { RuleContext } from "./types";
import { getRulesConfig, getSeriesOverride } from "@/lib/config/rules";
import { completeSeasonRule } from "./complete-season";
import { languageAvailableSeasonRule, languageAvailableMovieRule } from "./language-available";
import { fullyMonitoredRule } from "./fully-monitored";

/** Evaluate readiness for a single season */
export function evaluateSeason(
  season: Season,
  series: Series
): ReadinessVerdict {
  const config = getRulesConfig();
  const override = getSeriesOverride(series.title, series.tvdbId ?? undefined);
  const disabledRules = new Set(override?.disabledRules ?? []);

  const context: RuleContext = {
    config,
    seriesOverride: override,
  };

  const results: RuleResult[] = [];

  // Apply enabled rules (skip disabled ones)
  if (config.rules.completeSeason && !disabledRules.has("complete-season")) {
    results.push(completeSeasonRule(season, context));
  }
  if (config.rules.languageAvailable && !disabledRules.has("language-available")) {
    results.push(languageAvailableSeasonRule(season, context));
  }
  if (config.rules.fullyMonitored && !disabledRules.has("fully-monitored")) {
    results.push(fullyMonitoredRule(season, context));
  }

  return composeVerdict(results, config.compositionMode, config.almostReadyThreshold);
}

/** Evaluate readiness for a movie */
export function evaluateMovie(movie: Movie): ReadinessVerdict {
  const config = getRulesConfig();

  const context: RuleContext = { config };
  const results: RuleResult[] = [];

  // Only language rule applies to movies
  if (config.rules.languageAvailable) {
    results.push(languageAvailableMovieRule(movie, context));
  }

  return composeVerdict(results, config.compositionMode, config.almostReadyThreshold);
}

/** Compose individual rule results into an overall verdict */
function composeVerdict(
  results: RuleResult[],
  mode: "and" | "or",
  almostReadyThreshold: number
): ReadinessVerdict {
  if (results.length === 0) {
    return {
      status: "ready",
      ruleResults: [],
      progressPercent: 1,
    };
  }

  const allPassed =
    mode === "and"
      ? results.every((r) => r.passed)
      : results.some((r) => r.passed);

  // Calculate overall progress as average of individual rule progress
  const totalNumerator = results.reduce((sum, r) => sum + r.numerator, 0);
  const totalDenominator = results.reduce((sum, r) => sum + r.denominator, 0);
  const progressPercent =
    totalDenominator > 0 ? totalNumerator / totalDenominator : 1;

  if (allPassed) {
    return { status: "ready", ruleResults: results, progressPercent };
  }

  if (progressPercent >= almostReadyThreshold) {
    return { status: "almost-ready", ruleResults: results, progressPercent };
  }

  return { status: "not-ready", ruleResults: results, progressPercent };
}
