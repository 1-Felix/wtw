import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { arrSaveSchema } from "../schemas";
import { setSetting, deleteSettings } from "@/lib/db/settings";
import { restartSyncScheduler } from "@/lib/sync/orchestrator";
import { invalidateConfigCache } from "@/middleware";

const RADARR_KEYS = ["radarr.url", "radarr.apiKey"];

/**
 * PUT /api/services/radarr — save Radarr connection details and restart sync.
 */
export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json();

    const parseResult = arrSaveSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.prettifyError(parseResult.error) },
        { status: 400 }
      );
    }

    const { url, apiKey } = parseResult.data;
    const normalizedUrl = url.replace(/\/+$/, "");

    setSetting("radarr.url", normalizedUrl);
    setSetting("radarr.apiKey", apiKey);

    invalidateConfigCache();
    await restartSyncScheduler();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save Radarr config" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/radarr — disconnect Radarr by removing DB keys and restarting scheduler.
 */
export async function DELETE() {
  try {
    deleteSettings(RADARR_KEYS);
    invalidateConfigCache();
    await restartSyncScheduler();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disconnect Radarr" },
      { status: 500 }
    );
  }
}
