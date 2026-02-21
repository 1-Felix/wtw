import { describe, it, expect } from "vitest";
import { formatDiscordEmbed } from "./discord-formatter";
import { formatGenericPayload } from "./generic-formatter";
import type { TransitionEvent } from "./transition-detector";

const seasonEvent: TransitionEvent = {
  mediaId: "series-1-s3",
  mediaTitle: "Breaking Bad",
  mediaType: "season",
  seasonNumber: 3,
  eventType: "ready",
  previousStatus: "almost-ready",
  episodeCurrent: 13,
  episodeTotal: 13,
};

const movieEvent: TransitionEvent = {
  mediaId: "movie-1",
  mediaTitle: "Inception",
  mediaType: "movie",
  eventType: "almost-ready",
  previousStatus: "not-ready",
};

describe("formatDiscordEmbed", () => {
  it("formats a season ready event", () => {
    const payload = formatDiscordEmbed(seasonEvent);
    const embeds = payload.embeds as Array<Record<string, unknown>>;
    expect(embeds).toHaveLength(1);
    expect(embeds[0].title).toBe("Ready to Watch");
    expect(embeds[0].description).toContain("Breaking Bad");
    expect(embeds[0].description).toContain("Season 3");
    expect(embeds[0].color).toBe(0xf59e0b);
    expect(embeds[0].footer).toEqual({ text: "wtw" });
    expect(embeds[0].timestamp).toBeDefined();
  });

  it("formats an almost-ready event with different color", () => {
    const payload = formatDiscordEmbed(movieEvent);
    const embeds = payload.embeds as Array<Record<string, unknown>>;
    expect(embeds[0].title).toBe("Almost Ready");
    expect(embeds[0].color).toBe(0xd97706);
    expect(embeds[0].description).toContain("Inception");
  });

  it("includes episode count in fields for seasons", () => {
    const payload = formatDiscordEmbed(seasonEvent);
    const embeds = payload.embeds as Array<Record<string, unknown>>;
    const fields = embeds[0].fields as Array<{ name: string; value: string }>;
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("Episodes");
    expect(fields[0].value).toBe("13/13");
  });
});

describe("formatGenericPayload", () => {
  it("formats a season ready event", () => {
    const payload = formatGenericPayload(seasonEvent);
    expect(payload.event).toBe("media.ready");
    expect(payload.timestamp).toBeDefined();

    const media = payload.media as Record<string, unknown>;
    expect(media.id).toBe("series-1-s3");
    expect(media.title).toBe("Breaking Bad");
    expect(media.type).toBe("season");
    expect(media.seasonNumber).toBe(3);
    expect(media.progress).toEqual({ current: 13, total: 13 });

    const verdict = payload.verdict as Record<string, unknown>;
    expect(verdict.status).toBe("ready");
    expect(verdict.previousStatus).toBe("almost-ready");
  });

  it("formats a movie almost-ready event", () => {
    const payload = formatGenericPayload(movieEvent);
    expect(payload.event).toBe("media.almost-ready");

    const verdict = payload.verdict as Record<string, unknown>;
    expect(verdict.status).toBe("almost-ready");
    expect(verdict.previousStatus).toBe("not-ready");

    const media = payload.media as Record<string, unknown>;
    expect(media.title).toBe("Inception");
    expect(media.type).toBe("movie");
    expect(media.seasonNumber).toBeUndefined();
    expect(media.progress).toBeUndefined();
  });
});
