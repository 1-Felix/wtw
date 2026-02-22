// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeriesGroupCard } from "./media-card";
import type { RuleResult } from "@/lib/models/readiness";

// Mock leaf components to avoid side-effects (Image, icons, etc.)
vi.mock("./poster-image", () => ({
  PosterImage: (props: { title: string }) => (
    <div data-testid="poster-image">{props.title}</div>
  ),
}));

vi.mock("./readiness-badge", () => ({
  ReadinessBadge: (props: { status: string }) => (
    <span data-testid="readiness-badge">{props.status}</span>
  ),
}));

vi.mock("./progress-bar", () => ({
  ProgressBar: (props: { value: number; label?: string }) => (
    <div data-testid="progress-bar" data-value={props.value}>
      {props.label}
    </div>
  ),
}));

function makeRule(
  overrides: Partial<RuleResult> & { ruleName: string }
): RuleResult {
  return {
    passed: true,
    detail: "",
    numerator: 0,
    denominator: 0,
    ...overrides,
  };
}

describe("SeriesGroupCard", () => {
  const baseProps = {
    seriesTitle: "Breaking Bad",
    seasonNumbers: [1, 2, 3],
    totalEpisodes: 36,
    availableEpisodes: 36,
    posterImageId: "poster-123",
    verdict: {
      status: "ready" as const,
      ruleResults: [],
      progressPercent: 1,
    },
  };

  it("renders series title", () => {
    render(<SeriesGroupCard {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "Breaking Bad" })
    ).toBeInTheDocument();
  });

  it("renders poster image with series title", () => {
    render(<SeriesGroupCard {...baseProps} />);
    const poster = screen.getByTestId("poster-image");
    expect(poster).toHaveTextContent("Breaking Bad");
  });

  it("renders season summary for contiguous seasons", () => {
    render(<SeriesGroupCard {...baseProps} />);
    // formatSeasonSummary([1,2,3]) = "Seasons 1-3"
    expect(screen.getByText(/Seasons 1-3/)).toBeInTheDocument();
  });

  it("renders season summary for non-contiguous seasons", () => {
    render(
      <SeriesGroupCard {...baseProps} seasonNumbers={[1, 3, 7]} />
    );
    expect(screen.getByText(/Seasons 1, 3, 7/)).toBeInTheDocument();
  });

  it("renders total episode count", () => {
    render(<SeriesGroupCard {...baseProps} />);
    expect(screen.getByText(/36\/36 episodes/)).toBeInTheDocument();
  });

  it("renders readiness badge", () => {
    render(<SeriesGroupCard {...baseProps} />);
    const badge = screen.getByTestId("readiness-badge");
    expect(badge).toHaveTextContent("ready");
  });

  it("renders progress bar for almost-ready verdict", () => {
    render(
      <SeriesGroupCard
        {...baseProps}
        verdict={{
          status: "almost-ready",
          ruleResults: [
            makeRule({
              ruleName: "language",
              passed: false,
              detail: "Missing English",
              numerator: 8,
              denominator: 12,
            }),
          ],
          progressPercent: 0.88,
        }}
      />
    );
    const bar = screen.getByTestId("progress-bar");
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute("data-value", "0.88");
  });

  it("does not render progress bar for ready verdict", () => {
    render(<SeriesGroupCard {...baseProps} />);
    expect(screen.queryByTestId("progress-bar")).not.toBeInTheDocument();
  });

  it("renders rule result details for ready items with rules", () => {
    render(
      <SeriesGroupCard
        {...baseProps}
        verdict={{
          status: "ready",
          ruleResults: [
            makeRule({
              ruleName: "complete",
              passed: true,
              detail: "All episodes available",
              numerator: 12,
              denominator: 12,
            }),
          ],
          progressPercent: 1,
        }}
      />
    );
    expect(
      screen.getByText("All episodes available")
    ).toBeInTheDocument();
  });
});
