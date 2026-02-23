// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

import { NavLink } from "./nav-link";

describe("NavLink", () => {
  describe("expanded mode (collapsed=false or undefined)", () => {
    it("renders label text", () => {
      render(
        <NavLink href="/" label="Ready to Watch" count={5} />,
      );
      expect(screen.getByText("Ready to Watch")).toBeInTheDocument();
    });

    it("renders inline count pill when count > 0", () => {
      render(
        <NavLink href="/" label="Ready to Watch" count={5} />,
      );
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("does not render count pill when count is 0", () => {
      render(
        <NavLink href="/" label="Languages" count={0} />,
      );
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });

    it("renders 99+ for counts above 99", () => {
      render(
        <NavLink href="/" label="Ready to Watch" count={150} />,
      );
      expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("renders icon when provided", () => {
      render(
        <NavLink
          href="/"
          label="Ready to Watch"
          icon={<span data-testid="test-icon">icon</span>}
        />,
      );
      expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });
  });

  describe("collapsed mode", () => {
    it("renders icon without label text", () => {
      render(
        <NavLink
          href="/"
          label=""
          icon={<span data-testid="test-icon">icon</span>}
          title="Ready to Watch"
          collapsed
        />,
      );
      expect(screen.getByTestId("test-icon")).toBeInTheDocument();
      expect(screen.queryByText("Ready to Watch")).not.toBeInTheDocument();
    });

    it("renders superscript count badge when count > 0", () => {
      render(
        <NavLink
          href="/"
          label=""
          icon={<span data-testid="test-icon">icon</span>}
          title="Ready to Watch"
          count={5}
          collapsed
        />,
      );
      const badge = screen.getByText("5");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("bg-primary");
      expect(badge.className).toContain("text-primary-foreground");
      expect(badge.className).toContain("absolute");
    });

    it("does not render badge when count is 0", () => {
      render(
        <NavLink
          href="/"
          label=""
          icon={<span data-testid="test-icon">icon</span>}
          title="Languages"
          count={0}
          collapsed
        />,
      );
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });

    it("renders 99+ badge for counts above 99", () => {
      render(
        <NavLink
          href="/"
          label=""
          icon={<span data-testid="test-icon">icon</span>}
          title="Ready to Watch"
          count={200}
          collapsed
        />,
      );
      expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("has title attribute for tooltip", () => {
      render(
        <NavLink
          href="/"
          label=""
          icon={<span data-testid="test-icon">icon</span>}
          title="Ready to Watch"
          collapsed
        />,
      );
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("title", "Ready to Watch");
    });

    it("includes count in aria-label", () => {
      render(
        <NavLink
          href="/"
          label=""
          icon={<span data-testid="test-icon">icon</span>}
          title="Ready to Watch"
          count={5}
          collapsed
        />,
      );
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("aria-label", "Ready to Watch, 5 items");
    });
  });

  describe("active state", () => {
    it("sets aria-current=page when active", () => {
      mockPathname = "/";
      render(<NavLink href="/" label="Ready to Watch" />);
      expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
    });

    it("does not set aria-current when inactive", () => {
      mockPathname = "/almost-ready";
      render(<NavLink href="/" label="Ready to Watch" />);
      expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
    });
  });
});
