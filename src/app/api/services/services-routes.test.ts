import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing routes
vi.mock("@/lib/config/services", () => ({
  getServiceConfig: vi.fn(),
  getConfigSources: vi.fn(),
}));

vi.mock("@/lib/db/settings", () => ({
  setSetting: vi.fn(),
  deleteSettings: vi.fn(),
}));

vi.mock("@/lib/sync/orchestrator", () => ({
  restartSyncScheduler: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/middleware", () => ({
  invalidateConfigCache: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getServiceConfig, getConfigSources } from "@/lib/config/services";
import { setSetting, deleteSettings } from "@/lib/db/settings";
import { restartSyncScheduler } from "@/lib/sync/orchestrator";

import { GET as getConfig } from "./config/route";
import { POST as testJellyfin } from "./jellyfin/test/route";
import { POST as authJellyfin } from "./jellyfin/auth/route";
import { DELETE as disconnectJellyfin } from "./jellyfin/route";
import { POST as testSonarr } from "./sonarr/test/route";
import { PUT as saveSonarr, DELETE as disconnectSonarr } from "./sonarr/route";
import { POST as testRadarr } from "./radarr/test/route";
import { PUT as saveRadarr, DELETE as disconnectRadarr } from "./radarr/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function putRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  vi.mocked(restartSyncScheduler).mockResolvedValue(undefined);
});

// --- GET /api/services/config ---

describe("GET /api/services/config", () => {
  it("returns service status when all configured via env", async () => {
    vi.mocked(getServiceConfig).mockReturnValue({
      jellyfin: { url: "http://jf:8096", apiKey: "key", userId: "uid", userName: "Admin" },
      sonarr: { url: "http://sonarr:8989", apiKey: "skey" },
      radarr: { url: "http://radarr:7878", apiKey: "rkey" },
    });
    vi.mocked(getConfigSources).mockReturnValue({
      jellyfin: "env",
      sonarr: "env",
      radarr: "db",
    });

    const response = await getConfig();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jellyfin).toEqual({ configured: true, userName: "Admin", maskedApiKey: "key", source: "env" });
    expect(body.sonarr).toEqual({ configured: true, maskedApiKey: "skey", source: "env" });
    expect(body.radarr).toEqual({ configured: true, maskedApiKey: "rkey", source: "db" });
  });

  it("masks API keys showing only last 4 characters", async () => {
    vi.mocked(getServiceConfig).mockReturnValue({
      jellyfin: { url: "http://jf:8096", apiKey: "abcdef1234567890", userId: "uid", userName: "Admin" },
      sonarr: { url: "http://sonarr:8989", apiKey: "sonarr-api-key-value" },
      radarr: null,
    });
    vi.mocked(getConfigSources).mockReturnValue({
      jellyfin: "db",
      sonarr: "db",
      radarr: null,
    });

    const response = await getConfig();
    const body = await response.json();

    expect(body.jellyfin.maskedApiKey).toBe("••••••••7890");
    expect(body.sonarr.maskedApiKey).toBe("••••••••alue");
    expect(body.radarr.maskedApiKey).toBeNull();
  });

  it("returns unconfigured status when nothing is set up", async () => {
    vi.mocked(getServiceConfig).mockReturnValue({
      jellyfin: null,
      sonarr: null,
      radarr: null,
    });
    vi.mocked(getConfigSources).mockReturnValue({
      jellyfin: null,
      sonarr: null,
      radarr: null,
    });

    const response = await getConfig();
    const body = await response.json();

    expect(body.jellyfin).toEqual({ configured: false, userName: null, maskedApiKey: null, source: null });
    expect(body.sonarr).toEqual({ configured: false, maskedApiKey: null, source: null });
  });
});

// --- POST /api/services/jellyfin/test ---

describe("POST /api/services/jellyfin/test", () => {
  it("returns success with server name when server is reachable", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ServerName: "My Jellyfin" }), { status: 200 })
    );

    const response = await testJellyfin(jsonRequest({ url: "http://jellyfin:8096" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, serverName: "My Jellyfin" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://jellyfin:8096/System/Info/Public",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("returns 502 when server is unreachable", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const response = await testJellyfin(jsonRequest({ url: "http://jellyfin:8096" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("Could not reach Jellyfin server");
  });

  it("returns 400 for invalid request body", async () => {
    const response = await testJellyfin(jsonRequest({ url: "not-a-url" }));
    expect(response.status).toBe(400);
  });

  it("returns 502 when server returns non-200", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const response = await testJellyfin(jsonRequest({ url: "http://jellyfin:8096" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toContain("404");
  });

  it("strips trailing slashes from URL", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ServerName: "JF" }), { status: 200 })
    );

    await testJellyfin(jsonRequest({ url: "http://jellyfin:8096///" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "http://jellyfin:8096/System/Info/Public",
      expect.any(Object)
    );
  });
});

// --- POST /api/services/jellyfin/auth ---

describe("POST /api/services/jellyfin/auth", () => {
  it("authenticates successfully and stores credentials", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          AccessToken: "tok-123",
          User: { Id: "user-456", Name: "TestAdmin" },
        }),
        { status: 200 }
      )
    );

    const response = await authJellyfin(
      jsonRequest({
        serverUrl: "http://jellyfin:8096",
        username: "admin",
        password: "pass",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, userName: "TestAdmin" });

    // Verify credentials stored in DB
    expect(setSetting).toHaveBeenCalledWith("jellyfin.url", "http://jellyfin:8096");
    expect(setSetting).toHaveBeenCalledWith("jellyfin.apiKey", "tok-123");
    expect(setSetting).toHaveBeenCalledWith("jellyfin.userId", "user-456");
    expect(setSetting).toHaveBeenCalledWith("jellyfin.userName", "TestAdmin");

    // Verify scheduler restarted
    expect(restartSyncScheduler).toHaveBeenCalled();
  });

  it("returns 401 for invalid credentials", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 })
    );

    const response = await authJellyfin(
      jsonRequest({
        serverUrl: "http://jellyfin:8096",
        username: "admin",
        password: "wrong",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid username or password");
    expect(setSetting).not.toHaveBeenCalled();
  });

  it("returns 502 when server is unreachable", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const response = await authJellyfin(
      jsonRequest({
        serverUrl: "http://jellyfin:8096",
        username: "admin",
        password: "pass",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("Could not reach Jellyfin server");
  });

  it("returns 400 for missing fields", async () => {
    const response = await authJellyfin(jsonRequest({ serverUrl: "http://jf:8096" }));
    expect(response.status).toBe(400);
  });

  it("returns 502 when response lacks AccessToken", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ User: { Id: "uid" } }), { status: 200 })
    );

    const response = await authJellyfin(
      jsonRequest({
        serverUrl: "http://jellyfin:8096",
        username: "admin",
        password: "pass",
      })
    );

    expect(response.status).toBe(502);
  });
});

// --- DELETE /api/services/jellyfin ---

describe("DELETE /api/services/jellyfin", () => {
  it("removes Jellyfin keys and restarts scheduler", async () => {
    const response = await disconnectJellyfin();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(deleteSettings).toHaveBeenCalledWith([
      "jellyfin.url",
      "jellyfin.apiKey",
      "jellyfin.userId",
      "jellyfin.userName",
    ]);
    expect(restartSyncScheduler).toHaveBeenCalled();
  });
});

// --- POST /api/services/sonarr/test ---

describe("POST /api/services/sonarr/test", () => {
  it("returns success with version when Sonarr is reachable", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ version: "4.0.0.1" }), { status: 200 })
    );

    const response = await testSonarr(
      jsonRequest({ url: "http://sonarr:8989", apiKey: "sonarr-key" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, version: "4.0.0.1" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://sonarr:8989/api/v3/system/status",
      expect.objectContaining({
        headers: { "X-Api-Key": "sonarr-key" },
      })
    );
  });

  it("returns 502 when Sonarr returns non-200", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const response = await testSonarr(
      jsonRequest({ url: "http://sonarr:8989", apiKey: "bad-key" })
    );

    expect(response.status).toBe(502);
  });

  it("returns 502 when Sonarr is unreachable", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const response = await testSonarr(
      jsonRequest({ url: "http://sonarr:8989", apiKey: "key" })
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("Could not reach Sonarr server");
  });
});

// --- PUT/DELETE /api/services/sonarr ---

describe("PUT /api/services/sonarr", () => {
  it("saves Sonarr config and restarts scheduler", async () => {
    const response = await saveSonarr(
      putRequest({ url: "http://sonarr:8989", apiKey: "sonarr-key" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(setSetting).toHaveBeenCalledWith("sonarr.url", "http://sonarr:8989");
    expect(setSetting).toHaveBeenCalledWith("sonarr.apiKey", "sonarr-key");
    expect(restartSyncScheduler).toHaveBeenCalled();
  });

  it("returns 400 for invalid input", async () => {
    const response = await saveSonarr(putRequest({ url: "not-a-url" }));
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/services/sonarr", () => {
  it("removes Sonarr keys and restarts scheduler", async () => {
    const response = await disconnectSonarr();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(deleteSettings).toHaveBeenCalledWith(["sonarr.url", "sonarr.apiKey"]);
    expect(restartSyncScheduler).toHaveBeenCalled();
  });
});

// --- POST /api/services/radarr/test ---

describe("POST /api/services/radarr/test", () => {
  it("returns success with version when Radarr is reachable", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ version: "5.1.2.0" }), { status: 200 })
    );

    const response = await testRadarr(
      jsonRequest({ url: "http://radarr:7878", apiKey: "radarr-key" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, version: "5.1.2.0" });
  });

  it("returns 502 when Radarr is unreachable", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const response = await testRadarr(
      jsonRequest({ url: "http://radarr:7878", apiKey: "key" })
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("Could not reach Radarr server");
  });
});

// --- PUT/DELETE /api/services/radarr ---

describe("PUT /api/services/radarr", () => {
  it("saves Radarr config and restarts scheduler", async () => {
    const response = await saveRadarr(
      putRequest({ url: "http://radarr:7878", apiKey: "radarr-key" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(setSetting).toHaveBeenCalledWith("radarr.url", "http://radarr:7878");
    expect(setSetting).toHaveBeenCalledWith("radarr.apiKey", "radarr-key");
    expect(restartSyncScheduler).toHaveBeenCalled();
  });
});

describe("DELETE /api/services/radarr", () => {
  it("removes Radarr keys and restarts scheduler", async () => {
    const response = await disconnectRadarr();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(deleteSettings).toHaveBeenCalledWith(["radarr.url", "radarr.apiKey"]);
    expect(restartSyncScheduler).toHaveBeenCalled();
  });
});
