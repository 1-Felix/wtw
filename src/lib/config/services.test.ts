import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServiceConfig, isJellyfinFullyConfigured, getConfigSources } from "./services";

// Mock env module
vi.mock("./env", () => ({
  getEnvConfig: vi.fn(() => ({})),
  isJellyfinConfiguredViaEnv: vi.fn(() => false),
  isSonarrConfigured: vi.fn(() => false),
  isRadarrConfigured: vi.fn(() => false),
}));

// Mock db settings module
vi.mock("@/lib/db/settings", () => ({
  getSetting: vi.fn(() => undefined),
}));

import { getEnvConfig, isJellyfinConfiguredViaEnv, isSonarrConfigured as isSonarrConfiguredViaEnv, isRadarrConfigured as isRadarrConfiguredViaEnv } from "./env";
import { getSetting } from "@/lib/db/settings";

/** Helper: mock getSetting to return values from a lookup map */
function mockDbSettings(values: Record<string, string>) {
  vi.mocked(getSetting).mockImplementation(<T,>(key: string): T | undefined => {
    const val = values[key];
    return val as T | undefined;
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Re-apply default mocks after restore
  vi.mocked(getEnvConfig).mockReturnValue({
    SYNC_INTERVAL_MINUTES: 15,
    PORT: 3000,
  });
  vi.mocked(isJellyfinConfiguredViaEnv).mockReturnValue(false);
  vi.mocked(isSonarrConfiguredViaEnv).mockReturnValue(false);
  vi.mocked(isRadarrConfiguredViaEnv).mockReturnValue(false);
  vi.mocked(getSetting).mockReturnValue(undefined);
});

describe("getServiceConfig", () => {
  it("returns null for all services when nothing is configured", () => {
    const config = getServiceConfig();
    expect(config.jellyfin).toBeNull();
    expect(config.sonarr).toBeNull();
    expect(config.radarr).toBeNull();
  });

  it("returns Jellyfin config from env vars when available", () => {
    vi.mocked(isJellyfinConfiguredViaEnv).mockReturnValue(true);
    vi.mocked(getEnvConfig).mockReturnValue({
      JELLYFIN_URL: "http://jellyfin:8096",
      JELLYFIN_API_KEY: "env-api-key",
      JELLYFIN_USER_ID: "env-user-id",
      SYNC_INTERVAL_MINUTES: 15,
      PORT: 3000,
    });

    const config = getServiceConfig();
    expect(config.jellyfin).toEqual({
      url: "http://jellyfin:8096",
      apiKey: "env-api-key",
      userId: "env-user-id",
      userName: null,
    });
  });

  it("returns Jellyfin config from database when env vars are not set", () => {
    mockDbSettings({
      "jellyfin.url": "http://db-jellyfin:8096",
      "jellyfin.apiKey": "db-api-key",
      "jellyfin.userId": "db-user-id",
      "jellyfin.userName": "TestUser",
    });

    const config = getServiceConfig();
    expect(config.jellyfin).toEqual({
      url: "http://db-jellyfin:8096",
      apiKey: "db-api-key",
      userId: "db-user-id",
      userName: "TestUser",
    });
  });

  it("env vars override database values for Jellyfin", () => {
    vi.mocked(isJellyfinConfiguredViaEnv).mockReturnValue(true);
    vi.mocked(getEnvConfig).mockReturnValue({
      JELLYFIN_URL: "http://env-jellyfin:8096",
      JELLYFIN_API_KEY: "env-key",
      JELLYFIN_USER_ID: "env-uid",
      SYNC_INTERVAL_MINUTES: 15,
      PORT: 3000,
    });
    // DB also has values, but env should win
    mockDbSettings({
      "jellyfin.url": "http://db-jellyfin:8096",
      "jellyfin.apiKey": "db-key",
      "jellyfin.userId": "db-uid",
    });

    const config = getServiceConfig();
    expect(config.jellyfin?.url).toBe("http://env-jellyfin:8096");
    expect(config.jellyfin?.apiKey).toBe("env-key");
  });

  it("returns null for Jellyfin when only partial DB config exists", () => {
    mockDbSettings({
      "jellyfin.url": "http://partial:8096",
    });

    const config = getServiceConfig();
    expect(config.jellyfin).toBeNull();
  });

  it("returns Sonarr config from env vars", () => {
    vi.mocked(isSonarrConfiguredViaEnv).mockReturnValue(true);
    vi.mocked(getEnvConfig).mockReturnValue({
      SONARR_URL: "http://sonarr:8989",
      SONARR_API_KEY: "sonarr-key",
      SYNC_INTERVAL_MINUTES: 15,
      PORT: 3000,
    });

    const config = getServiceConfig();
    expect(config.sonarr).toEqual({
      url: "http://sonarr:8989",
      apiKey: "sonarr-key",
    });
  });

  it("returns Radarr config from database", () => {
    mockDbSettings({
      "radarr.url": "http://radarr:7878",
      "radarr.apiKey": "radarr-db-key",
    });

    const config = getServiceConfig();
    expect(config.radarr).toEqual({
      url: "http://radarr:7878",
      apiKey: "radarr-db-key",
    });
  });
});

describe("isJellyfinFullyConfigured", () => {
  it("returns false when nothing is configured", () => {
    expect(isJellyfinFullyConfigured()).toBe(false);
  });

  it("returns true when configured via env", () => {
    vi.mocked(isJellyfinConfiguredViaEnv).mockReturnValue(true);
    vi.mocked(getEnvConfig).mockReturnValue({
      JELLYFIN_URL: "http://jellyfin:8096",
      JELLYFIN_API_KEY: "key",
      JELLYFIN_USER_ID: "uid",
      SYNC_INTERVAL_MINUTES: 15,
      PORT: 3000,
    });
    expect(isJellyfinFullyConfigured()).toBe(true);
  });

  it("returns true when configured via database", () => {
    mockDbSettings({
      "jellyfin.url": "http://jellyfin:8096",
      "jellyfin.apiKey": "key",
      "jellyfin.userId": "uid",
    });
    expect(isJellyfinFullyConfigured()).toBe(true);
  });
});

describe("getConfigSources", () => {
  it("returns null for all services when nothing is configured", () => {
    const sources = getConfigSources();
    expect(sources.jellyfin).toBeNull();
    expect(sources.sonarr).toBeNull();
    expect(sources.radarr).toBeNull();
  });

  it("returns 'env' when service is configured via env vars", () => {
    vi.mocked(isJellyfinConfiguredViaEnv).mockReturnValue(true);
    vi.mocked(isSonarrConfiguredViaEnv).mockReturnValue(true);

    const sources = getConfigSources();
    expect(sources.jellyfin).toBe("env");
    expect(sources.sonarr).toBe("env");
  });

  it("returns 'db' when service is configured via database", () => {
    mockDbSettings({
      "jellyfin.url": "http://jf:8096",
      "jellyfin.apiKey": "key",
      "jellyfin.userId": "uid",
      "radarr.url": "http://radarr:7878",
      "radarr.apiKey": "rkey",
    });

    const sources = getConfigSources();
    expect(sources.jellyfin).toBe("db");
    expect(sources.radarr).toBe("db");
    expect(sources.sonarr).toBeNull();
  });
});
