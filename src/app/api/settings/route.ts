import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getAllSettings, setAllSettings, hasSettings } from "@/lib/db/settings";
import { rulesConfigSchema, reloadRulesConfig } from "@/lib/config/rules";

/**
 * Partial update schema — all fields optional for PATCH-style updates.
 */
const settingsUpdateSchema = z.object({
  rules: z
    .object({
      completeSeason: z.boolean().optional(),
      languageAvailable: z.boolean().optional(),
      fullyMonitored: z.boolean().optional(),
    })
    .optional(),
  languageTarget: z.string().optional(),
  almostReadyThreshold: z.number().min(0).max(1).optional(),
  compositionMode: z.enum(["and", "or"]).optional(),
  hideWatched: z.boolean().optional(),
});

/**
 * GET /api/settings — returns all current settings as a RulesConfig-shaped object.
 */
export async function GET() {
  try {
    if (!hasSettings()) {
      // Return defaults if no settings are persisted yet
      const defaults = rulesConfigSchema.parse({});
      return NextResponse.json(defaults);
    }

    const raw = getAllSettings();

    // Reconstruct the RulesConfig shape from flat DB keys
    const config = {
      rules: {
        completeSeason: raw["rules.completeSeason"] ?? true,
        languageAvailable: raw["rules.languageAvailable"] ?? true,
        fullyMonitored: raw["rules.fullyMonitored"] ?? true,
      },
      languageTarget: raw["languageTarget"] ?? "English",
      almostReadyThreshold: raw["almostReadyThreshold"] ?? 0.8,
      compositionMode: raw["compositionMode"] ?? "and",
      hideWatched: raw["hideWatched"] ?? true,
    };

    const result = rulesConfigSchema.safeParse(config);
    if (!result.success) {
      return NextResponse.json(rulesConfigSchema.parse({}));
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings — accepts partial settings, validates, merges, persists.
 */
export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json();

    // Validate the partial update
    const parseResult = settingsUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.prettifyError(parseResult.error) },
        { status: 400 }
      );
    }

    const update = parseResult.data;

    // Read current settings from DB (or defaults)
    const current = getAllSettings();

    // Merge: update only the fields that were provided
    const merged: Record<string, unknown> = { ...current };

    if (update.rules) {
      if (update.rules.completeSeason !== undefined) {
        merged["rules.completeSeason"] = update.rules.completeSeason;
      }
      if (update.rules.languageAvailable !== undefined) {
        merged["rules.languageAvailable"] = update.rules.languageAvailable;
      }
      if (update.rules.fullyMonitored !== undefined) {
        merged["rules.fullyMonitored"] = update.rules.fullyMonitored;
      }
    }

    if (update.languageTarget !== undefined) {
      merged["languageTarget"] = update.languageTarget;
    }
    if (update.almostReadyThreshold !== undefined) {
      merged["almostReadyThreshold"] = update.almostReadyThreshold;
    }
    if (update.compositionMode !== undefined) {
      merged["compositionMode"] = update.compositionMode;
    }
    if (update.hideWatched !== undefined) {
      merged["hideWatched"] = update.hideWatched;
    }

    // Persist merged settings
    setAllSettings(merged);

    // Reload the cached rules config so it picks up changes
    reloadRulesConfig();

    // Return the full updated config
    const updatedConfig = {
      rules: {
        completeSeason: merged["rules.completeSeason"] ?? true,
        languageAvailable: merged["rules.languageAvailable"] ?? true,
        fullyMonitored: merged["rules.fullyMonitored"] ?? true,
      },
      languageTarget: merged["languageTarget"] ?? "English",
      almostReadyThreshold: merged["almostReadyThreshold"] ?? 0.8,
      compositionMode: merged["compositionMode"] ?? "and",
      hideWatched: merged["hideWatched"] ?? true,
    };

    return NextResponse.json(updatedConfig);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}
