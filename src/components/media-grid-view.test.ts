import { describe, it, expect } from "vitest";
import { matchesQuery } from "./media-grid-view";

describe("matchesQuery", () => {
  it("matches exact title", () => {
    expect(matchesQuery("Breaking Bad", "Breaking Bad")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(matchesQuery("Breaking Bad", "breaking bad")).toBe(true);
    expect(matchesQuery("breaking bad", "BREAKING BAD")).toBe(true);
  });

  it("matches partial title", () => {
    expect(matchesQuery("Breaking Bad", "Break")).toBe(true);
    expect(matchesQuery("Breaking Bad", "Bad")).toBe(true);
    expect(matchesQuery("Breaking Bad", "aking")).toBe(true);
  });

  it("returns false for non-matching query", () => {
    expect(matchesQuery("Breaking Bad", "Stranger Things")).toBe(false);
  });

  it("matches empty query against any title", () => {
    expect(matchesQuery("Breaking Bad", "")).toBe(true);
    expect(matchesQuery("", "")).toBe(true);
  });

  it("returns false when title is empty but query is not", () => {
    expect(matchesQuery("", "test")).toBe(false);
  });
});
