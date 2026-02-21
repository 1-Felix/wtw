import type { Season, Movie } from "@/lib/models/media";
import type { RuleResult } from "@/lib/models/readiness";
import type { RuleContext } from "./types";

export const RULE_NAME = "language-available";

export function languageAvailableSeasonRule(
  season: Season,
  context: RuleContext
): RuleResult {
  const targetLang =
    context.seriesOverride?.languageTarget ?? context.config.languageTarget;
  const targetLower = targetLang.toLowerCase();

  let withLang = 0;
  let total = 0;

  for (const episode of season.episodes) {
    if (!episode.hasFile) continue;
    total++;

    // If no audio stream data, treat optimistically
    if (episode.audioStreams.length === 0) {
      withLang++;
      continue;
    }

    const hasTarget = episode.audioStreams.some(
      (s) => s.language.toLowerCase() === targetLower
    );
    if (hasTarget) withLang++;
  }

  if (total === 0) {
    return {
      ruleName: RULE_NAME,
      passed: true,
      detail: "No episodes to check",
      numerator: 0,
      denominator: 0,
    };
  }

  const passed = withLang >= total;

  return {
    ruleName: RULE_NAME,
    passed,
    detail: passed
      ? `All ${total} episodes have ${targetLang} audio`
      : `${withLang}/${total} episodes have ${targetLang} audio`,
    numerator: withLang,
    denominator: total,
  };
}

export function languageAvailableMovieRule(
  movie: Movie,
  context: RuleContext
): RuleResult {
  const targetLang =
    context.config.languageTarget;
  const targetLower = targetLang.toLowerCase();

  // If no audio stream data, treat optimistically
  if (movie.audioStreams.length === 0) {
    return {
      ruleName: RULE_NAME,
      passed: true,
      detail: "No audio stream data available",
      numerator: 1,
      denominator: 1,
    };
  }

  const hasTarget = movie.audioStreams.some(
    (s) => s.language.toLowerCase() === targetLower
  );

  return {
    ruleName: RULE_NAME,
    passed: hasTarget,
    detail: hasTarget
      ? `${targetLang} audio available`
      : `${targetLang} audio not available`,
    numerator: hasTarget ? 1 : 0,
    denominator: 1,
  };
}
