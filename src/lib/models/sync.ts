export type ServiceName = "jellyfin" | "sonarr" | "radarr";

export interface ServiceStatus {
  name: ServiceName;
  configured: boolean;
  connected: boolean;
  lastSuccess: string | null;
  lastError: string | null;
  lastErrorMessage: string | null;
}

export type SyncPhase = "idle" | "syncing" | "initializing";

export interface SyncState {
  phase: SyncPhase;
  lastSyncStart: string | null;
  lastSyncEnd: string | null;
  services: Record<ServiceName, ServiceStatus>;
}

export function createInitialSyncState(
  jellyfinConfigured: boolean,
  sonarrConfigured: boolean,
  radarrConfigured: boolean
): SyncState {
  return {
    phase: "initializing",
    lastSyncStart: null,
    lastSyncEnd: null,
    services: {
      jellyfin: {
        name: "jellyfin",
        configured: jellyfinConfigured,
        connected: false,
        lastSuccess: null,
        lastError: null,
        lastErrorMessage: null,
      },
      sonarr: {
        name: "sonarr",
        configured: sonarrConfigured,
        connected: false,
        lastSuccess: null,
        lastError: null,
        lastErrorMessage: null,
      },
      radarr: {
        name: "radarr",
        configured: radarrConfigured,
        connected: false,
        lastSuccess: null,
        lastError: null,
        lastErrorMessage: null,
      },
    },
  };
}
