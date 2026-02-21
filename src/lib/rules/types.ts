import type { Season, Movie } from "@/lib/models/media";
import type { RuleResult } from "@/lib/models/readiness";
import type { RulesConfig } from "@/lib/config/rules";

export interface RuleContext {
  config: RulesConfig;
  /** Override config for this specific series (if any) */
  seriesOverride?: {
    disabledRules?: string[];
    languageTarget?: string;
  };
}

/** A rule function that evaluates a season */
export type SeasonRule = (
  season: Season,
  context: RuleContext
) => RuleResult;

/** A rule function that evaluates a movie */
export type MovieRule = (
  movie: Movie,
  context: RuleContext
) => RuleResult;
