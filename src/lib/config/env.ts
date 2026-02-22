import { z } from "zod/v4";

const envSchema = z.object({
  // Required — Jellyfin
  JELLYFIN_URL: z.url().describe("Jellyfin server URL"),
  JELLYFIN_API_KEY: z.string().min(1).describe("Jellyfin API key"),
  JELLYFIN_USER_ID: z.string().min(1).describe("Jellyfin user ID (needed for watch status)"),

  // Optional — Sonarr
  SONARR_URL: z.url().optional().describe("Sonarr server URL"),
  SONARR_API_KEY: z.string().min(1).optional().describe("Sonarr API key"),

  // Optional — Radarr
  RADARR_URL: z.url().optional().describe("Radarr server URL"),
  RADARR_API_KEY: z.string().min(1).optional().describe("Radarr API key"),

  // Sync
  SYNC_INTERVAL_MINUTES: z.coerce.number().int().min(1).default(15),

  // Server
  PORT: z.coerce.number().int().min(1).default(3000),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (cachedConfig) return cachedConfig;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    console.error("Environment variable validation failed:\n", formatted);
    process.exit(1);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function isSonarrConfigured(): boolean {
  const config = getEnvConfig();
  return Boolean(config.SONARR_URL && config.SONARR_API_KEY);
}

export function isRadarrConfigured(): boolean {
  const config = getEnvConfig();
  return Boolean(config.RADARR_URL && config.RADARR_API_KEY);
}
