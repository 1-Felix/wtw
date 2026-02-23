import { getEnvConfig, isJellyfinConfiguredViaEnv, isSonarrConfigured as isSonarrConfiguredViaEnv, isRadarrConfigured as isRadarrConfiguredViaEnv } from "./env";
import { getSetting } from "@/lib/db/settings";

export interface JellyfinConfig {
  url: string;
  apiKey: string;
  userId: string;
  userName: string | null;
}

export interface ArrConfig {
  url: string;
  apiKey: string;
}

export interface ServiceConfig {
  jellyfin: JellyfinConfig | null;
  sonarr: ArrConfig | null;
  radarr: ArrConfig | null;
}

export type ConfigSource = "env" | "db" | null;

export interface ServiceConfigSources {
  jellyfin: ConfigSource;
  sonarr: ConfigSource;
  radarr: ConfigSource;
}

/**
 * Resolve service connection details using layered configuration.
 * Priority: environment variables (highest) → database settings → null
 */
export function getServiceConfig(): ServiceConfig {
  return {
    jellyfin: resolveJellyfinConfig(),
    sonarr: resolveSonarrConfig(),
    radarr: resolveRadarrConfig(),
  };
}

/**
 * Check if Jellyfin is fully configured from either env vars or database.
 */
export function isJellyfinFullyConfigured(): boolean {
  return resolveJellyfinConfig() !== null;
}

/**
 * Check if Sonarr is fully configured from either env vars or database.
 */
export function isSonarrFullyConfigured(): boolean {
  return resolveSonarrConfig() !== null;
}

/**
 * Check if Radarr is fully configured from either env vars or database.
 */
export function isRadarrFullyConfigured(): boolean {
  return resolveRadarrConfig() !== null;
}

/**
 * Get the configuration source for each service.
 * Returns "env" if configured via environment variables, "db" if via database, null if not configured.
 */
export function getConfigSources(): ServiceConfigSources {
  return {
    jellyfin: getJellyfinConfigSource(),
    sonarr: getSonarrConfigSource(),
    radarr: getRadarrConfigSource(),
  };
}

// --- Internal resolution functions ---

function resolveJellyfinConfig(): JellyfinConfig | null {
  // Env vars take priority
  if (isJellyfinConfiguredViaEnv()) {
    const config = getEnvConfig();
    return {
      url: config.JELLYFIN_URL!,
      apiKey: config.JELLYFIN_API_KEY!,
      userId: config.JELLYFIN_USER_ID!,
      userName: null,
    };
  }

  // Fall back to database
  const url = getSetting<string>("jellyfin.url");
  const apiKey = getSetting<string>("jellyfin.apiKey");
  const userId = getSetting<string>("jellyfin.userId");

  if (url && apiKey && userId) {
    const userName = getSetting<string>("jellyfin.userName") ?? null;
    return { url, apiKey, userId, userName };
  }

  return null;
}

function resolveSonarrConfig(): ArrConfig | null {
  // Env vars take priority
  if (isSonarrConfiguredViaEnv()) {
    const config = getEnvConfig();
    return {
      url: config.SONARR_URL!,
      apiKey: config.SONARR_API_KEY!,
    };
  }

  // Fall back to database
  const url = getSetting<string>("sonarr.url");
  const apiKey = getSetting<string>("sonarr.apiKey");

  if (url && apiKey) {
    return { url, apiKey };
  }

  return null;
}

function resolveRadarrConfig(): ArrConfig | null {
  // Env vars take priority
  if (isRadarrConfiguredViaEnv()) {
    const config = getEnvConfig();
    return {
      url: config.RADARR_URL!,
      apiKey: config.RADARR_API_KEY!,
    };
  }

  // Fall back to database
  const url = getSetting<string>("radarr.url");
  const apiKey = getSetting<string>("radarr.apiKey");

  if (url && apiKey) {
    return { url, apiKey };
  }

  return null;
}

function getJellyfinConfigSource(): ConfigSource {
  if (isJellyfinConfiguredViaEnv()) return "env";
  const url = getSetting<string>("jellyfin.url");
  const apiKey = getSetting<string>("jellyfin.apiKey");
  const userId = getSetting<string>("jellyfin.userId");
  if (url && apiKey && userId) return "db";
  return null;
}

function getSonarrConfigSource(): ConfigSource {
  if (isSonarrConfiguredViaEnv()) return "env";
  const url = getSetting<string>("sonarr.url");
  const apiKey = getSetting<string>("sonarr.apiKey");
  if (url && apiKey) return "db";
  return null;
}

function getRadarrConfigSource(): ConfigSource {
  if (isRadarrConfiguredViaEnv()) return "env";
  const url = getSetting<string>("radarr.url");
  const apiKey = getSetting<string>("radarr.apiKey");
  if (url && apiKey) return "db";
  return null;
}
