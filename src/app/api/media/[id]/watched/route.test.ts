import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared mock functions for JellyfinClient instance methods
const mockMarkAsWatched = vi.fn();
const mockMarkAsUnwatched = vi.fn();

// Mock dependencies
vi.mock("@/lib/config/services", () => ({
  getServiceConfig: vi.fn(),
}));

vi.mock("@/lib/sync/cache", () => ({
  markItemWatched: vi.fn(),
}));

vi.mock("@/lib/clients/jellyfin", () => ({
  JellyfinClient: class MockJellyfinClient {
    markAsWatched = mockMarkAsWatched;
    markAsUnwatched = mockMarkAsUnwatched;
    constructor(
      public url?: string,
      public apiKey?: string,
      public userId?: string
    ) {}
  },
}));

import { getServiceConfig } from "@/lib/config/services";
import { markItemWatched } from "@/lib/sync/cache";
import { JellyfinClient } from "@/lib/clients/jellyfin";
import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/media/test-id/watched", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const mockJellyfinConfig = {
  jellyfin: { url: "http://jf:8096", apiKey: "key", userId: "uid", userName: "Admin" },
  sonarr: null,
  radarr: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServiceConfig).mockReturnValue(mockJellyfinConfig);
  mockMarkAsWatched.mockResolvedValue(undefined);
  mockMarkAsUnwatched.mockResolvedValue(undefined);
});

describe("POST /api/media/[id]/watched", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/media/test-id/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await POST(req, makeParams("test-id"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid JSON");
  });

  it("returns 400 when watched is not a boolean", async () => {
    const res = await POST(jsonRequest({ watched: "yes" }), makeParams("test-id"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("watched: boolean");
  });

  it("returns 503 when Jellyfin is not configured", async () => {
    vi.mocked(getServiceConfig).mockReturnValue({
      jellyfin: null,
      sonarr: null,
      radarr: null,
    });

    const res = await POST(jsonRequest({ watched: true }), makeParams("test-id"));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain("not configured");
  });

  it("calls markAsWatched and updates cache on watched=true", async () => {
    const res = await POST(jsonRequest({ watched: true }), makeParams("item-123"));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockMarkAsWatched).toHaveBeenCalledWith("item-123");
    expect(markItemWatched).toHaveBeenCalledWith("item-123", true);
  });

  it("calls markAsUnwatched and updates cache on watched=false", async () => {
    const res = await POST(jsonRequest({ watched: false }), makeParams("item-123"));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockMarkAsUnwatched).toHaveBeenCalledWith("item-123");
    expect(markItemWatched).toHaveBeenCalledWith("item-123", false);
  });

  it("returns 502 and does NOT update cache when Jellyfin API fails", async () => {
    mockMarkAsWatched.mockRejectedValueOnce(new Error("Connection refused"));

    const res = await POST(jsonRequest({ watched: true }), makeParams("item-123"));
    expect(res.status).toBe(502);

    const data = await res.json();
    expect(data.error).toContain("Connection refused");
    expect(markItemWatched).not.toHaveBeenCalled();
  });

  it("uses Jellyfin config from getServiceConfig", async () => {
    await POST(jsonRequest({ watched: true }), makeParams("item-123"));

    // Verify getServiceConfig was called and its result was used
    // (the client was constructed and markAsWatched was called, proving the config path works)
    expect(getServiceConfig).toHaveBeenCalled();
    expect(mockMarkAsWatched).toHaveBeenCalledWith("item-123");
  });
});
