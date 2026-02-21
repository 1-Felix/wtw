import { z } from "zod/v4";
import fs from "node:fs";

const ruleOverrideSchema = z.object({
  /** Disable specific rules for this series */
  disabledRules: z.array(z.string()).optional(),
  /** Override language target for this series */
  languageTarget: z.string().optional(),
});

const rulesConfigSchema = z.object({
  /** Global rule toggles */
  rules: z
    .object({
      completeSeason: z.boolean().default(true),
      languageAvailable: z.boolean().default(true),
      fullyMonitored: z.boolean().default(true),
    })
    .default(() => ({
      completeSeason: true,
      languageAvailable: true,
      fullyMonitored: true,
    })),

  /** Target audio language for the language-available rule */
  languageTarget: z.string().default("English"),

  /** Threshold (0-1) for "almost ready" classification */
  almostReadyThreshold: z.number().min(0).max(1).default(0.8),

  /** Rule composition mode */
  compositionMode: z.enum(["and", "or"]).default("and"),

  /** Per-series overrides keyed by series title or TVDB ID */
  overrides: z.record(z.string(), ruleOverrideSchema).default({}),
});

export type RulesConfig = z.infer<typeof rulesConfigSchema>;
export type RuleOverride = z.infer<typeof ruleOverrideSchema>;

const CONFIG_PATH = "/config/rules.json";
const DEFAULT_CONFIG: RulesConfig = rulesConfigSchema.parse({});

let cachedRulesConfig: RulesConfig | null = null;
let lastConfigError: string | null = null;

/** Get the last rules config error message (null if config is valid) */
export function getRulesConfigError(): string | null {
  return lastConfigError;
}

export function loadRulesConfig(): RulesConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.log(
      `No rules config found at ${CONFIG_PATH}, using defaults.`
    );
    lastConfigError = null;
    cachedRulesConfig = DEFAULT_CONFIG;
    return cachedRulesConfig;
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const json: unknown = JSON.parse(raw);
    const result = rulesConfigSchema.safeParse(json);

    if (!result.success) {
      const formatted = z.prettifyError(result.error);
      const errorMsg = `Invalid rules config at ${CONFIG_PATH}: ${formatted}`;
      console.error(`${errorMsg}\nFalling back to defaults.`);
      lastConfigError = errorMsg;
      cachedRulesConfig = DEFAULT_CONFIG;
      return cachedRulesConfig;
    }

    lastConfigError = null;
    cachedRulesConfig = result.data;
    return cachedRulesConfig;
  } catch (err) {
    const errorMsg = `Failed to read rules config at ${CONFIG_PATH}: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`${errorMsg}\nFalling back to defaults.`);
    lastConfigError = errorMsg;
    cachedRulesConfig = DEFAULT_CONFIG;
    return cachedRulesConfig;
  }
}

export function getRulesConfig(): RulesConfig {
  if (cachedRulesConfig) return cachedRulesConfig;
  return loadRulesConfig();
}

/** Reload config from disk (called on each sync cycle) */
export function reloadRulesConfig(): RulesConfig {
  cachedRulesConfig = null;
  return loadRulesConfig();
}

/** Get override for a specific series, matching by title or TVDB ID */
export function getSeriesOverride(
  seriesTitle: string,
  tvdbId?: string
): RuleOverride | undefined {
  const config = getRulesConfig();
  return (
    config.overrides[seriesTitle] ??
    (tvdbId ? config.overrides[tvdbId] : undefined)
  );
}
