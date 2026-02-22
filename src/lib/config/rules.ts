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

  /** Whether to hide fully-watched items from dashboard views */
  hideWatched: z.boolean().default(true),
});

export { rulesConfigSchema, ruleOverrideSchema };
export type RulesConfig = z.infer<typeof rulesConfigSchema>;
export type RuleOverride = z.infer<typeof ruleOverrideSchema>;

const CONFIG_PATH = "/config/rules.json";
const DEFAULT_CONFIG: RulesConfig = rulesConfigSchema.parse({});

let cachedRulesConfig: RulesConfig | null = null;
let lastConfigError: string | null = null;
let rulesJsonImported = false;

/** Get the last rules config error message (null if config is valid) */
export function getRulesConfigError(): string | null {
  return lastConfigError;
}

/**
 * Load rules config with priority: DB → file fallback (with import) → defaults.
 */
/** Check if rules.json was imported to the database on startup. */
export function wasRulesJsonImported(): boolean {
  return rulesJsonImported;
}

export function loadRulesConfig(): RulesConfig {
  // 1. Try loading from database
  const dbConfig = loadFromDatabase();
  if (dbConfig) {
    // Log if rules.json exists but DB settings take precedence
    if (fs.existsSync(CONFIG_PATH)) {
      console.log("Database settings take precedence over rules.json. Edit settings through the web UI.");
    }
    lastConfigError = null;
    cachedRulesConfig = dbConfig;
    return cachedRulesConfig;
  }

  // 2. Try loading from rules.json file (and import to DB if available)
  const fileConfig = loadFromFile();
  if (fileConfig) {
    importToDatabase(fileConfig);
    rulesJsonImported = true;
    lastConfigError = null;
    cachedRulesConfig = fileConfig;
    return cachedRulesConfig;
  }

  // 3. Use defaults
  console.log("No rules config found in database or file, using defaults.");
  lastConfigError = null;
  cachedRulesConfig = DEFAULT_CONFIG;
  return cachedRulesConfig;
}

export function getRulesConfig(): RulesConfig {
  if (cachedRulesConfig) return cachedRulesConfig;
  return loadRulesConfig();
}

/** Reload config (called on each sync cycle). Clears cache to force re-read from DB. */
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

// --- Internal helpers ---

function loadFromDatabase(): RulesConfig | null {
  try {
    // Dynamic import to avoid circular dependencies and allow fallback
    // when DB is not initialized (e.g., during build)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAllSettings, hasSettings } = require("@/lib/db/settings");

    if (!hasSettings()) {
      return null;
    }

    const settings = getAllSettings();
    const partial: Record<string, unknown> = {};

    // Map flat DB keys back to the nested RulesConfig shape
    if (settings["rules.completeSeason"] !== undefined ||
        settings["rules.languageAvailable"] !== undefined ||
        settings["rules.fullyMonitored"] !== undefined) {
      partial.rules = {
        completeSeason: settings["rules.completeSeason"] ?? true,
        languageAvailable: settings["rules.languageAvailable"] ?? true,
        fullyMonitored: settings["rules.fullyMonitored"] ?? true,
      };
    }

    if (settings["languageTarget"] !== undefined) {
      partial.languageTarget = settings["languageTarget"];
    }
    if (settings["almostReadyThreshold"] !== undefined) {
      partial.almostReadyThreshold = settings["almostReadyThreshold"];
    }
    if (settings["compositionMode"] !== undefined) {
      partial.compositionMode = settings["compositionMode"];
    }
    if (settings["overrides"] !== undefined) {
      partial.overrides = settings["overrides"];
    }
    if (settings["hideWatched"] !== undefined) {
      partial.hideWatched = settings["hideWatched"];
    }

    const result = rulesConfigSchema.safeParse(partial);
    if (result.success) {
      return result.data;
    }

    console.error("Invalid settings in database, falling back:", z.prettifyError(result.error));
    return null;
  } catch {
    // DB not available (e.g., during build or if /config not writable)
    return null;
  }
}

function loadFromFile(): RulesConfig | null {
  if (!fs.existsSync(CONFIG_PATH)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const json: unknown = JSON.parse(raw);
    const result = rulesConfigSchema.safeParse(json);

    if (!result.success) {
      const formatted = z.prettifyError(result.error);
      const errorMsg = `Invalid rules config at ${CONFIG_PATH}: ${formatted}`;
      console.error(`${errorMsg}\nSkipping import, using defaults.`);
      lastConfigError = errorMsg;
      return null;
    }

    return result.data;
  } catch (err) {
    const errorMsg = `Failed to read rules config at ${CONFIG_PATH}: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`${errorMsg}\nSkipping import, using defaults.`);
    lastConfigError = errorMsg;
    return null;
  }
}

function importToDatabase(config: RulesConfig): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setAllSettings } = require("@/lib/db/settings");

    const settings: Record<string, unknown> = {
      "rules.completeSeason": config.rules.completeSeason,
      "rules.languageAvailable": config.rules.languageAvailable,
      "rules.fullyMonitored": config.rules.fullyMonitored,
      "languageTarget": config.languageTarget,
      "almostReadyThreshold": config.almostReadyThreshold,
      "compositionMode": config.compositionMode,
      "overrides": config.overrides,
      "hideWatched": config.hideWatched,
    };

    setAllSettings(settings);
    console.log("Migrated rules.json configuration to database.");
  } catch (err) {
    console.error(
      "Failed to import rules.json to database:",
      err instanceof Error ? err.message : String(err)
    );
  }
}
