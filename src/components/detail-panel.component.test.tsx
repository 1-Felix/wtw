// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailPanel } from "./detail-panel";
import type { SeriesGroupDetailItem } from "./detail-panel";

// Mock UI components that depend on Radix portals
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

// Mock Sheet components to render children directly (no Radix portal needed)
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({
    children,
  }: {
    children: React.ReactNode;
    side?: string;
    showCloseButton?: boolean;
    className?: string;
  }) => <div data-testid="sheet-content">{children}</div>,
  SheetTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2>{children}</h2>,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Check: () => <span data-testid="icon-check" />,
  ChevronDown: ({ className }: { className?: string }) => (
    <span data-testid="icon-chevron" className={className} />
  ),
  CircleCheck: () => <span data-testid="icon-circle-check" />,
  Play: () => <span data-testid="icon-play" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  EyeOff: () => <span data-testid="icon-eye-off" />,
  Search: () => <span data-testid="icon-search" />,
  X: () => <span data-testid="icon-x" />,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock utility
vi.mock("@/lib/utils", () => ({
  formatRelativeTime: (date: string) => `relative(${date})`,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

function makeGroupItem(
  seasonCount: number = 3
): SeriesGroupDetailItem {
  return {
    type: "series-group",
    seriesId: "series-1",
    seriesTitle: "Breaking Bad",
    posterImageId: "poster-123",
    seasons: Array.from({ length: seasonCount }, (_, i) => ({
      seriesId: "series-1",
      seriesTitle: "Breaking Bad",
      seasonNumber: i + 1,
      totalEpisodes: 12,
      availableEpisodes: 12,
      posterImageId: "poster-123",
      verdict: {
        status: "ready" as const,
        ruleResults: [],
        progressPercent: 1,
      },
      episodes: [
        {
          episodeNumber: 1,
          title: `S${i + 1}E01 Pilot`,
          hasFile: true,
          audioLanguages: ["English"],
          isWatched: false,
          playbackProgress: null,
          lastPlayed: null,
        },
        {
          episodeNumber: 2,
          title: `S${i + 1}E02 Second`,
          hasFile: true,
          audioLanguages: ["English"],
          isWatched: false,
          playbackProgress: null,
          lastPlayed: null,
        },
      ],
      watchedEpisodes: 0,
      lastPlayedAt: null,
    })),
  };
}

describe("SeriesGroupDetail", () => {
  const onClose = vi.fn();
  const onDismiss = vi.fn();

  it("renders series title and poster", () => {
    const item = makeGroupItem(3);
    render(
      <DetailPanel item={item} onClose={onClose} onDismiss={onDismiss} />
    );

    // Title appears in SheetTitle (h2), the h3, and the poster mock — verify all present
    const headings = screen.getAllByRole("heading", { name: "Breaking Bad" });
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("poster-image")).toHaveTextContent(
      "Breaking Bad"
    );
  });

  it("renders season count summary", () => {
    const item = makeGroupItem(3);
    render(
      <DetailPanel item={item} onClose={onClose} onDismiss={onDismiss} />
    );

    expect(screen.getByText("3 seasons")).toBeInTheDocument();
  });

  it("renders total episode count across seasons", () => {
    const item = makeGroupItem(3);
    render(
      <DetailPanel item={item} onClose={onClose} onDismiss={onDismiss} />
    );

    // 3 seasons x 12 episodes = 36 total
    expect(screen.getByText("36/36 episodes available")).toBeInTheDocument();
  });

  it("renders all season headers collapsed by default", () => {
    const item = makeGroupItem(3);
    render(
      <DetailPanel item={item} onClose={onClose} onDismiss={onDismiss} />
    );

    expect(screen.getByText("Season 1")).toBeInTheDocument();
    expect(screen.getByText("Season 2")).toBeInTheDocument();
    expect(screen.getByText("Season 3")).toBeInTheDocument();

    // Episode titles should NOT be visible (collapsed)
    expect(screen.queryByText("S1E01 Pilot")).not.toBeInTheDocument();
  });

  it("expands a season section on click", async () => {
    const user = userEvent.setup();
    const item = makeGroupItem(3);
    render(
      <DetailPanel item={item} onClose={onClose} onDismiss={onDismiss} />
    );

    // Click "Season 1" header
    await user.click(screen.getByText("Season 1"));

    // Now episodes for season 1 should be visible
    expect(screen.getByText("S1E01 Pilot")).toBeInTheDocument();
    expect(screen.getByText("S1E02 Second")).toBeInTheDocument();

    // Season 2 episodes should still be hidden
    expect(screen.queryByText("S2E01 Pilot")).not.toBeInTheDocument();
  });

  it("collapses an expanded season on re-click", async () => {
    const user = userEvent.setup();
    const item = makeGroupItem(2);
    render(
      <DetailPanel item={item} onClose={onClose} onDismiss={onDismiss} />
    );

    // Expand
    await user.click(screen.getByText("Season 1"));
    expect(screen.getByText("S1E01 Pilot")).toBeInTheDocument();

    // Collapse
    await user.click(screen.getByText("Season 1"));
    expect(screen.queryByText("S1E01 Pilot")).not.toBeInTheDocument();
  });

  it("allows multiple sections expanded simultaneously", async () => {
    const user = userEvent.setup();
    const item = makeGroupItem(3);
    render(
      <DetailPanel item={item} onClose={onClose} onDismiss={onDismiss} />
    );

    // Expand season 1 and season 3
    await user.click(screen.getByText("Season 1"));
    await user.click(screen.getByText("Season 3"));

    // Both should show their episodes
    expect(screen.getByText("S1E01 Pilot")).toBeInTheDocument();
    expect(screen.getByText("S3E01 Pilot")).toBeInTheDocument();

    // Season 2 still collapsed
    expect(screen.queryByText("S2E01 Pilot")).not.toBeInTheDocument();
  });

  it("renders dismiss button with 'Dismiss All Seasons' label", () => {
    const item = makeGroupItem(2);
    render(
      <DetailPanel item={item} onClose={onClose} onDismiss={onDismiss} />
    );

    const dismissBtn = screen.getByRole("button", {
      name: /Dismiss All Seasons/,
    });
    expect(dismissBtn).toBeInTheDocument();
  });

  it("renders readiness badge for each season header", () => {
    const item = makeGroupItem(3);
    render(
      <DetailPanel item={item} onClose={onClose} onDismiss={onDismiss} />
    );

    // 3 season headers each with a badge + possibly 1 main badge = at least 3
    const badges = screen.getAllByTestId("readiness-badge");
    expect(badges.length).toBeGreaterThanOrEqual(3);
  });
});
