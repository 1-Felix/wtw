// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mocks ---

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock lucide-react icons used in services-section
vi.mock("lucide-react", () => ({
  CheckCircle2: () => <span data-testid="icon-check-circle" />,
  Clapperboard: () => <span data-testid="icon-clapperboard" />,
  Film: () => <span data-testid="icon-film" />,
  Info: () => <span data-testid="icon-info" />,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="icon-loader" className={className} />
  ),
  Tv: () => <span data-testid="icon-tv" />,
  Unplug: () => <span data-testid="icon-unplug" />,
  XCircle: () => <span data-testid="icon-x-circle" />,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock AlertDialog components to render children directly
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  AlertDialogTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div>{children}</div>,
}));

// Mock useServiceConfig hook
const mockUseServiceConfig = vi.fn();
vi.mock("../hooks/use-service-config", () => ({
  useServiceConfig: () => mockUseServiceConfig(),
}));

import { ServicesSection } from "./services-section";
import type { ServiceStatus } from "../hooks/use-service-config";

// --- Helpers ---

function makeJellyfinConnected(
  overrides?: Partial<ServiceStatus["jellyfin"]>,
): ServiceStatus {
  return {
    jellyfin: {
      configured: true,
      userName: "admin",
      maskedApiKey: "abc***xyz",
      source: "db",
      externalUrl: "http://jellyfin:8096",
      externalUrlSource: null,
      ...overrides,
    },
    sonarr: {
      configured: false,
      maskedApiKey: null,
      source: null,
    },
    radarr: {
      configured: false,
      maskedApiKey: null,
      source: null,
    },
  };
}

function makeJellyfinDisconnected(): ServiceStatus {
  return {
    jellyfin: {
      configured: false,
      userName: null,
      maskedApiKey: null,
      source: null,
      externalUrl: null,
      externalUrlSource: null,
    },
    sonarr: {
      configured: false,
      maskedApiKey: null,
      source: null,
    },
    radarr: {
      configured: false,
      maskedApiKey: null,
      source: null,
    },
  };
}

const noopServiceConfig = {
  loading: false,
  error: null,
  refresh: vi.fn(),
  testJellyfin: vi.fn(),
  authJellyfin: vi.fn(),
  disconnectJellyfin: vi.fn(),
  testArr: vi.fn(),
  saveArr: vi.fn(),
  disconnectArr: vi.fn(),
};

// --- Tests ---

describe("ServicesSection — JellyfinCard external URL", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows external URL field when Jellyfin is connected", () => {
    mockUseServiceConfig.mockReturnValue({
      ...noopServiceConfig,
      status: makeJellyfinConnected(),
    });

    render(<ServicesSection />);

    expect(screen.getByText("External URL")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "https://jellyfin.example.com (optional)",
      ),
    ).toBeInTheDocument();
  });

  it("does NOT show external URL field when Jellyfin is not connected", () => {
    mockUseServiceConfig.mockReturnValue({
      ...noopServiceConfig,
      status: makeJellyfinDisconnected(),
    });

    render(<ServicesSection />);

    expect(screen.queryByText("External URL")).not.toBeInTheDocument();
  });

  it("calls PUT to save external URL when user types and clicks Save", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);

    mockUseServiceConfig.mockReturnValue({
      ...noopServiceConfig,
      status: makeJellyfinConnected(),
    });

    render(<ServicesSection />);

    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(
      "https://jellyfin.example.com (optional)",
    );

    await user.type(input, "https://jf.home.lan");

    // Save button should appear after typing
    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeInTheDocument();

    await user.click(saveButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/services/jellyfin/external-url",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ externalUrl: "https://jf.home.lan" }),
        }),
      );
    });
  });

  it("shows read-only input with env badge when externalUrlSource is env", () => {
    mockUseServiceConfig.mockReturnValue({
      ...noopServiceConfig,
      status: makeJellyfinConnected({
        externalUrl: "https://env-set.example.com",
        externalUrlSource: "env",
      }),
    });

    render(<ServicesSection />);

    // The input should be disabled and show the env-set URL
    const input = screen.getByDisplayValue("https://env-set.example.com");
    expect(input).toBeDisabled();

    // Should show the SourceBadge for env — there will be two: one for the
    // main Jellyfin card source (not rendered when source="db") and one for
    // the external URL. We check for the env message text.
    expect(
      screen.getByText(
        "Configured via environment variables. Remove them from Docker Compose to manage here.",
      ),
    ).toBeInTheDocument();

    // Save button should NOT appear
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
  });
});
