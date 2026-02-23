import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the env config so the constructor doesn't fail
vi.mock("@/lib/config/env", () => ({
  getEnvConfig: vi.fn(() => ({})),
}));

import { JellyfinClient } from "./jellyfin";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("JellyfinClient.markAsWatched", () => {
  it("sends POST to /Users/{userId}/PlayedItems/{itemId}", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const client = new JellyfinClient("http://jellyfin:8096", "test-api-key", "user-123");
    await client.markAsWatched("item-456");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/Users/user-123/PlayedItems/item-456");
    expect(url).toContain("api_key=test-api-key");
    expect(options.method).toBe("POST");
  });

  it("throws on non-2xx response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const client = new JellyfinClient("http://jellyfin:8096", "test-api-key", "user-123");
    await expect(client.markAsWatched("bad-id")).rejects.toThrow(
      /Jellyfin API error: 404 Not Found/
    );
  });
});

describe("JellyfinClient.markAsUnwatched", () => {
  it("sends DELETE to /Users/{userId}/PlayedItems/{itemId}", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const client = new JellyfinClient("http://jellyfin:8096", "test-api-key", "user-123");
    await client.markAsUnwatched("item-456");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/Users/user-123/PlayedItems/item-456");
    expect(url).toContain("api_key=test-api-key");
    expect(options.method).toBe("DELETE");
  });

  it("throws on non-2xx response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const client = new JellyfinClient("http://jellyfin:8096", "test-api-key", "user-123");
    await expect(client.markAsUnwatched("item-456")).rejects.toThrow(
      /Jellyfin API error: 500 Internal Server Error/
    );
  });
});
