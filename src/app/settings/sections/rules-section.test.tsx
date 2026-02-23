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

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: () => void;
    size?: string;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onCheckedChange}
      data-testid="switch"
    >
      {checked ? "on" : "off"}
    </button>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    value,
    onValueChange,
    min,
    max,
    step,
  }: {
    value: number[];
    onValueChange?: (v: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
  }) => (
    <input
      type="range"
      data-testid="threshold-slider"
      value={value[0]}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
    disabled,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="language-select"
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode; className?: string }) => (
    <>{children}</>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    value,
    disabled,
  }: {
    children: React.ReactNode;
    value: string;
    disabled?: boolean;
  }) => (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

import { RulesSection } from "./rules-section";
import type { RulesConfig } from "../schemas";

// --- Helpers ---

function makeConfig(overrides?: Partial<RulesConfig>): RulesConfig {
  return {
    rules: {
      completeSeason: true,
      languageAvailable: false,
      fullyMonitored: true,
    },
    languageTarget: "English",
    almostReadyThreshold: 0.8,
    compositionMode: "and",
    hideWatched: false,
    ...overrides,
  };
}

function setupLanguageFetch(languages: string[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ audio: languages, subtitle: [] }),
    }),
  );
}

// --- Tests ---

describe("RulesSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("inline language picker", () => {
    it("does not show language picker when languageAvailable is disabled", () => {
      setupLanguageFetch(["English", "German"]);
      const config = makeConfig({ rules: { completeSeason: true, languageAvailable: false, fullyMonitored: true } });
      render(<RulesSection config={config} onChange={vi.fn()} />);

      expect(screen.queryByText("Target Audio Language")).not.toBeInTheDocument();
    });

    it("shows language picker when languageAvailable is enabled", async () => {
      setupLanguageFetch(["English", "German"]);
      const config = makeConfig({
        rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
      });
      render(<RulesSection config={config} onChange={vi.fn()} />);

      expect(screen.getByText("Target Audio Language")).toBeInTheDocument();
    });

    it("shows loading skeleton while languages are fetching", () => {
      // Don't resolve the fetch
      vi.stubGlobal(
        "fetch",
        vi.fn().mockReturnValue(new Promise(() => {})),
      );
      const config = makeConfig({
        rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
      });
      render(<RulesSection config={config} onChange={vi.fn()} />);

      expect(screen.getByText("Target Audio Language")).toBeInTheDocument();
      // The skeleton is an animate-pulse div; the only select present should be the composition mode one
      const selects = screen.getAllByTestId("language-select");
      // Only the composition mode select should exist, not the language picker
      expect(selects).toHaveLength(1);
    });

    it("shows disabled dropdown with 'Sync media first' when no languages available", async () => {
      setupLanguageFetch([]);
      const config = makeConfig({
        rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
      });
      render(<RulesSection config={config} onChange={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Languages will be available after media is synced.")).toBeInTheDocument();
      });
    });

    it("calls onChange with updated languageTarget when language is selected", async () => {
      setupLanguageFetch(["English", "German", "Japanese"]);
      const onChange = vi.fn();
      const config = makeConfig({
        rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
        languageTarget: "English",
      });
      render(<RulesSection config={config} onChange={onChange} />);

      await waitFor(() => {
        // Two selects: composition mode + language picker
        expect(screen.getAllByTestId("language-select")).toHaveLength(2);
      });

      const user = userEvent.setup();
      // The language picker is the second select (composition mode is first)
      const selects = screen.getAllByTestId("language-select");
      const languageSelect = selects.find(el => el.querySelector('option[value="German"]'));
      expect(languageSelect).toBeTruthy();
      await user.selectOptions(languageSelect!, "German");

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ languageTarget: "German" }),
      );
    });

    it("hides language picker when languageAvailable is toggled off", async () => {
      setupLanguageFetch(["English", "German"]);
      const onChange = vi.fn();
      const config = makeConfig({
        rules: { completeSeason: true, languageAvailable: true, fullyMonitored: true },
      });
      const { rerender } = render(
        <RulesSection config={config} onChange={onChange} />,
      );

      expect(screen.getByText("Target Audio Language")).toBeInTheDocument();

      // Rerender with languageAvailable off
      const updatedConfig = makeConfig({
        rules: { completeSeason: true, languageAvailable: false, fullyMonitored: true },
      });
      rerender(<RulesSection config={updatedConfig} onChange={onChange} />);

      expect(screen.queryByText("Target Audio Language")).not.toBeInTheDocument();
    });
  });
});
