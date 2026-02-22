// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaGridView, SORT_READY } from "./media-grid-view";
import type { SeasonItem, SeriesGroupItem, MovieItem } from "./media-grid-view";
import type { ReadinessVerdict } from "@/lib/models/readiness";

// --- Mocks for leaf components ---

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

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-testid="sheet">{children}</div> : null),
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
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectValue: () => <span data-testid="select-value" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    className?: string;
  }) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

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

const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    replace: mockReplace,
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/utils", () => ({
  formatRelativeTime: (date: string) => `relative(${date})`,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

// --- Test data helpers ---

function makeVerdict(
  status: "ready" | "almost-ready" = "ready",
  progressPercent: number = 1
): ReadinessVerdict {
  return { status, ruleResults: [], progressPercent };
}

function makeSeason(
  seriesId: string,
  seriesTitle: string,
  seasonNumber: number,
  verdict?: ReadinessVerdict
): SeasonItem {
  return {
    seriesId,
    seriesTitle,
    seasonNumber,
    totalEpisodes: 12,
    availableEpisodes: 12,
    posterImageId: null,
    dateAdded: "2025-01-15",
    verdict: verdict ?? makeVerdict(),
  };
}

function makeGroup(
  seriesId: string,
  seriesTitle: string,
  seasonNumbers: number[]
): SeriesGroupItem {
  const seasons = seasonNumbers.map((n) =>
    makeSeason(seriesId, seriesTitle, n)
  );
  return {
    seriesId,
    seriesTitle,
    posterImageId: null,
    dateAdded: "2025-01-15",
    seasons,
    seasonCount: seasons.length,
    verdict: makeVerdict(),
  };
}

function makeMovie(id: string, title: string): MovieItem {
  return {
    id,
    title,
    year: 2024,
    posterImageId: null,
    audioLanguages: ["English"],
    dateAdded: "2025-01-10",
    verdict: makeVerdict(),
  };
}

// --- Tests ---

describe("MediaGridView with mixed items (task 8.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both grouped and ungrouped season cards alongside movies", () => {
    const seasons = [
      makeGroup("s1", "Breaking Bad", [1, 2, 3]),
      makeSeason("s2", "Better Call Saul", 1),
    ];
    const movies = [makeMovie("m1", "El Camino")];

    render(
      <MediaGridView
        seasons={seasons}
        movies={movies}
        emptyMessage="Nothing here"
        sort={SORT_READY}
      />
    );

    // Grouped card shows season summary
    expect(screen.getByText(/Seasons 1-3/)).toBeInTheDocument();
    // Ungrouped card shows season number
    expect(screen.getByText(/Season 1/)).toBeInTheDocument();
    // Movie card shows title (heading, not poster mock)
    expect(
      screen.getByRole("heading", { name: "El Camino" })
    ).toBeInTheDocument();
  });

  it("search filters grouped cards by seriesTitle", async () => {
    const user = userEvent.setup();
    const seasons = [
      makeGroup("s1", "Breaking Bad", [1, 2]),
      makeSeason("s2", "Better Call Saul", 1),
    ];
    const movies = [makeMovie("m1", "El Camino")];

    render(
      <MediaGridView
        seasons={seasons}
        movies={movies}
        emptyMessage="Nothing here"
        sort={SORT_READY}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search by title...");
    await user.type(searchInput, "Breaking");

    // Grouped card for "Breaking Bad" should remain
    expect(screen.getByText(/Seasons 1-2/)).toBeInTheDocument();
    // Others should be hidden
    expect(screen.queryByText("Better Call Saul")).not.toBeInTheDocument();
    expect(screen.queryByText("El Camino")).not.toBeInTheDocument();
  });

  it("type filter 'series' hides movies and shows grouped cards", async () => {
    const user = userEvent.setup();
    const seasons = [makeGroup("s1", "Breaking Bad", [1, 2])];
    const movies = [makeMovie("m1", "El Camino")];

    render(
      <MediaGridView
        seasons={seasons}
        movies={movies}
        emptyMessage="Nothing here"
        sort={SORT_READY}
      />
    );

    // Click "series" type filter
    await user.click(screen.getByText("series"));

    expect(screen.getByText(/Seasons 1-2/)).toBeInTheDocument();
    expect(screen.queryByText("El Camino")).not.toBeInTheDocument();
  });

  it("type filter 'movies' hides grouped cards and ungrouped seasons", async () => {
    const user = userEvent.setup();
    const seasons = [
      makeGroup("s1", "Breaking Bad", [1, 2]),
      makeSeason("s2", "Better Call Saul", 1),
    ];
    const movies = [makeMovie("m1", "El Camino")];

    render(
      <MediaGridView
        seasons={seasons}
        movies={movies}
        emptyMessage="Nothing here"
        sort={SORT_READY}
      />
    );

    await user.click(screen.getByText("movies"));

    expect(screen.queryByText(/Seasons 1-2/)).not.toBeInTheDocument();
    expect(screen.queryByText("Better Call Saul")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "El Camino" })
    ).toBeInTheDocument();
  });

  it("clicking a grouped card opens the detail panel with season list", async () => {
    const user = userEvent.setup();
    const seasons = [makeGroup("s1", "Breaking Bad", [1, 2, 3])];

    render(
      <MediaGridView
        seasons={seasons}
        movies={[]}
        emptyMessage="Nothing here"
        sort={SORT_READY}
      />
    );

    // Click the grouped card
    const card = screen.getByText(/Seasons 1-3/).closest("button")!;
    await user.click(card);

    // Detail panel should open with season sections
    const sheet = screen.getByTestId("sheet");
    expect(sheet).toBeInTheDocument();
    expect(within(sheet).getByText("3 seasons")).toBeInTheDocument();
  });

  it("shows empty state when no items provided", () => {
    render(
      <MediaGridView
        seasons={[]}
        movies={[]}
        emptyMessage="No items ready"
        sort={SORT_READY}
      />
    );

    expect(screen.getByText("No items ready")).toBeInTheDocument();
  });
});

describe("Grouped dismiss flow (task 8.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all fetches succeed
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true })
    );
  });

  it("dismiss hides the grouped card optimistically", async () => {
    const user = userEvent.setup();
    const seasons = [
      makeGroup("s1", "Breaking Bad", [1, 2, 3]),
      makeSeason("s2", "Better Call Saul", 1),
    ];

    render(
      <MediaGridView
        seasons={seasons}
        movies={[]}
        emptyMessage="Nothing here"
        sort={SORT_READY}
      />
    );

    // Open detail panel for the group
    const card = screen.getByText(/Seasons 1-3/).closest("button")!;
    await user.click(card);

    // Click dismiss
    const dismissBtn = screen.getByRole("button", {
      name: /Dismiss All Seasons/,
    });
    await user.click(dismissBtn);

    // The grouped card should disappear from the grid
    await waitFor(() => {
      expect(screen.queryByText(/Seasons 1-3/)).not.toBeInTheDocument();
    });

    // The single season card should still be visible
    expect(screen.getByText(/Season 1/)).toBeInTheDocument();
  });

  it("dismiss calls API for each season key in the group", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const seasons = [makeGroup("s1", "Breaking Bad", [1, 2, 3])];

    render(
      <MediaGridView
        seasons={seasons}
        movies={[]}
        emptyMessage="Nothing here"
        sort={SORT_READY}
      />
    );

    // Open detail panel and dismiss
    const card = screen.getByText(/Seasons 1-3/).closest("button")!;
    await user.click(card);

    const dismissBtn = screen.getByRole("button", {
      name: /Dismiss All Seasons/,
    });
    await user.click(dismissBtn);

    // Should POST dismiss for each season key
    await waitFor(() => {
      const postCalls = mockFetch.mock.calls.filter(
        (call: unknown[]) => {
          const opts = call[1] as { method?: string } | undefined;
          return opts?.method === "POST";
        }
      );
      expect(postCalls).toHaveLength(3);
      const urls = postCalls.map((call: unknown[]) => call[0]);
      expect(urls).toContain("/api/media/s1-s1/dismiss");
      expect(urls).toContain("/api/media/s1-s2/dismiss");
      expect(urls).toContain("/api/media/s1-s3/dismiss");
    });
  });

  it("API failure reverts the dismiss and shows error toast", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");

    // First call succeeds, second fails
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const seasons = [makeGroup("s1", "Breaking Bad", [1, 2])];

    render(
      <MediaGridView
        seasons={seasons}
        movies={[]}
        emptyMessage="Nothing here"
        sort={SORT_READY}
      />
    );

    const card = screen.getByText(/Seasons 1-2/).closest("button")!;
    await user.click(card);

    const dismissBtn = screen.getByRole("button", {
      name: /Dismiss All Seasons/,
    });
    await user.click(dismissBtn);

    // After failure, the card should reappear
    await waitFor(() => {
      expect(screen.getByText(/Seasons 1-2/)).toBeInTheDocument();
    });

    // Error toast should have been called
    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't dismiss item — try again"
    );
  });
});
