// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => ({
  Tv2: (props: Record<string, unknown>) => <span data-testid="icon-tv2" {...props} />,
  Clock: (props: Record<string, unknown>) => <span data-testid="icon-clock" {...props} />,
  Globe: (props: Record<string, unknown>) => <span data-testid="icon-globe" {...props} />,
  Play: (props: Record<string, unknown>) => <span data-testid="icon-play" {...props} />,
  Settings: (props: Record<string, unknown>) => <span data-testid="icon-settings" {...props} />,
}));

import { Sidebar } from "./sidebar";
import type { NavCounts } from "@/lib/counts";

const defaultCounts: NavCounts = {
  ready: 5,
  almostReady: 2,
  continue: 1,
};

describe("Sidebar", () => {
  describe("expanded mode (default)", () => {
    it("renders full text labels for all nav items", () => {
      mockPathname = "/";
      render(<Sidebar counts={defaultCounts} />);

      expect(screen.getByText("Ready to Watch")).toBeInTheDocument();
      expect(screen.getByText("Almost Ready")).toBeInTheDocument();
      expect(screen.getByText("Languages")).toBeInTheDocument();
      expect(screen.getByText("Continue Watching")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders inline count pills", () => {
      mockPathname = "/";
      render(<Sidebar counts={defaultCounts} />);

      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("renders icons alongside labels", () => {
      mockPathname = "/";
      render(<Sidebar counts={defaultCounts} />);

      expect(screen.getByTestId("icon-tv2")).toBeInTheDocument();
      expect(screen.getByTestId("icon-clock")).toBeInTheDocument();
      expect(screen.getByTestId("icon-globe")).toBeInTheDocument();
      expect(screen.getByTestId("icon-play")).toBeInTheDocument();
      expect(screen.getByTestId("icon-settings")).toBeInTheDocument();
    });

    it("shows wtw branding", () => {
      mockPathname = "/";
      render(<Sidebar counts={defaultCounts} />);

      expect(screen.getByText("wtw")).toBeInTheDocument();
    });
  });

  describe("collapsed mode", () => {
    it("hides text labels and shows only icons after collapse toggle", async () => {
      mockPathname = "/";
      const user = userEvent.setup();
      render(<Sidebar counts={defaultCounts} />);

      // Click collapse button
      const collapseBtn = screen.getByLabelText("Collapse sidebar");
      await user.click(collapseBtn);

      // Text labels should be gone
      expect(screen.queryByText("Ready to Watch")).not.toBeInTheDocument();
      expect(screen.queryByText("Almost Ready")).not.toBeInTheDocument();
      expect(screen.queryByText("Languages")).not.toBeInTheDocument();
      expect(screen.queryByText("Continue Watching")).not.toBeInTheDocument();

      // Icons should still be present
      expect(screen.getByTestId("icon-tv2")).toBeInTheDocument();
      expect(screen.getByTestId("icon-clock")).toBeInTheDocument();
      expect(screen.getByTestId("icon-globe")).toBeInTheDocument();
      expect(screen.getByTestId("icon-play")).toBeInTheDocument();
    });

    it("shows title tooltips on collapsed links", async () => {
      mockPathname = "/";
      const user = userEvent.setup();
      render(<Sidebar counts={defaultCounts} />);

      await user.click(screen.getByLabelText("Collapse sidebar"));

      const links = screen.getAllByRole("link");
      const readyLink = links.find((l) => l.getAttribute("title") === "Ready to Watch");
      const almostLink = links.find((l) => l.getAttribute("title") === "Almost Ready");

      expect(readyLink).toBeDefined();
      expect(almostLink).toBeDefined();
    });

    it("renders count badges on collapsed icons", async () => {
      mockPathname = "/";
      const user = userEvent.setup();
      render(<Sidebar counts={defaultCounts} />);

      await user.click(screen.getByLabelText("Collapse sidebar"));

      // Count badges should still be visible
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("hides wtw branding when collapsed", async () => {
      mockPathname = "/";
      const user = userEvent.setup();
      render(<Sidebar counts={defaultCounts} />);

      await user.click(screen.getByLabelText("Collapse sidebar"));

      expect(screen.queryByText("wtw")).not.toBeInTheDocument();
    });

    it("toggles back to expanded", async () => {
      mockPathname = "/";
      const user = userEvent.setup();
      render(<Sidebar counts={defaultCounts} />);

      await user.click(screen.getByLabelText("Collapse sidebar"));
      expect(screen.queryByText("Ready to Watch")).not.toBeInTheDocument();

      await user.click(screen.getByLabelText("Expand sidebar"));
      expect(screen.getByText("Ready to Watch")).toBeInTheDocument();
    });
  });

  describe("zero counts", () => {
    it("does not render badges for zero-count categories", () => {
      mockPathname = "/";
      const zeroCounts: NavCounts = { ready: 0, almostReady: 0, continue: 0 };
      render(<Sidebar counts={zeroCounts} />);

      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
  });
});
