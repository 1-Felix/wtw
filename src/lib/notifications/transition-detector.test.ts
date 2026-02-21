import { describe, it, expect } from "vitest";
import { detectTransitions } from "./transition-detector";
import type { VerdictMap, VerdictEntry } from "./transition-detector";

function entry(
  mediaId: string,
  status: "ready" | "almost-ready" | "not-ready",
  opts: Partial<VerdictEntry> = {}
): VerdictEntry {
  return {
    mediaId,
    mediaTitle: `Title ${mediaId}`,
    mediaType: "season",
    status,
    ...opts,
  };
}

describe("detectTransitions", () => {
  it("returns empty array on first sync (null previous)", () => {
    const current: VerdictMap = new Map([
      ["a", entry("a", "ready")],
      ["b", entry("b", "almost-ready")],
    ]);

    const events = detectTransitions(null, current);
    expect(events).toEqual([]);
  });

  it("detects not-ready → ready transition", () => {
    const prev: VerdictMap = new Map([["a", entry("a", "not-ready")]]);
    const curr: VerdictMap = new Map([["a", entry("a", "ready")]]);

    const events = detectTransitions(prev, curr);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("ready");
    expect(events[0].mediaId).toBe("a");
    expect(events[0].previousStatus).toBe("not-ready");
  });

  it("detects almost-ready → ready transition", () => {
    const prev: VerdictMap = new Map([["a", entry("a", "almost-ready")]]);
    const curr: VerdictMap = new Map([["a", entry("a", "ready")]]);

    const events = detectTransitions(prev, curr);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("ready");
    expect(events[0].previousStatus).toBe("almost-ready");
  });

  it("detects not-ready → almost-ready transition", () => {
    const prev: VerdictMap = new Map([["a", entry("a", "not-ready")]]);
    const curr: VerdictMap = new Map([["a", entry("a", "almost-ready")]]);

    const events = detectTransitions(prev, curr);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("almost-ready");
  });

  it("does not report when status is unchanged", () => {
    const prev: VerdictMap = new Map([["a", entry("a", "ready")]]);
    const curr: VerdictMap = new Map([["a", entry("a", "ready")]]);

    const events = detectTransitions(prev, curr);
    expect(events).toHaveLength(0);
  });

  it("does not report ready → not-ready (negative transition)", () => {
    const prev: VerdictMap = new Map([["a", entry("a", "ready")]]);
    const curr: VerdictMap = new Map([["a", entry("a", "not-ready")]]);

    const events = detectTransitions(prev, curr);
    expect(events).toHaveLength(0);
  });

  it("treats new item (no previous entry) as not-ready → current", () => {
    const prev: VerdictMap = new Map();
    const curr: VerdictMap = new Map([["a", entry("a", "ready")]]);

    const events = detectTransitions(prev, curr);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("ready");
    expect(events[0].previousStatus).toBe("not-ready");
  });

  it("handles multiple transitions in one sync", () => {
    const prev: VerdictMap = new Map([
      ["a", entry("a", "not-ready")],
      ["b", entry("b", "not-ready")],
      ["c", entry("c", "ready")],
    ]);
    const curr: VerdictMap = new Map([
      ["a", entry("a", "ready")],
      ["b", entry("b", "almost-ready")],
      ["c", entry("c", "ready")],
    ]);

    const events = detectTransitions(prev, curr);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.mediaId).sort()).toEqual(["a", "b"]);
  });
});
