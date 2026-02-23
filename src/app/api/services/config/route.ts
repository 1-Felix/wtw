import { NextResponse } from "next/server";
import { getServiceConfig, getConfigSources, getJellyfinExternalUrl } from "@/lib/config/services";

function maskApiKey(key: string): string {
  if (key.length <= 4) return key;
  return `${"•".repeat(8)}${key.slice(-4)}`;
}

/**
 * GET /api/services/config — returns service connection status with config sources.
 */
export async function GET() {
  try {
    const config = getServiceConfig();
    const sources = getConfigSources();
    const jellyfinExternal = getJellyfinExternalUrl();

    return NextResponse.json({
      jellyfin: {
        configured: config.jellyfin !== null,
        userName: config.jellyfin?.userName ?? null,
        maskedApiKey: config.jellyfin ? maskApiKey(config.jellyfin.apiKey) : null,
        source: sources.jellyfin,
        externalUrl: jellyfinExternal.externalUrl,
        externalUrlSource: jellyfinExternal.source,
      },
      sonarr: {
        configured: config.sonarr !== null,
        maskedApiKey: config.sonarr ? maskApiKey(config.sonarr.apiKey) : null,
        source: sources.sonarr,
      },
      radarr: {
        configured: config.radarr !== null,
        maskedApiKey: config.radarr ? maskApiKey(config.radarr.apiKey) : null,
        source: sources.radarr,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read service config" },
      { status: 500 }
    );
  }
}
