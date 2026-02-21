"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import type { NavCounts } from "@/lib/counts";

interface SidebarProps {
  counts: NavCounts;
}

export function Sidebar({ counts }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden shrink-0 border-r border-border bg-sidebar transition-all duration-200 md:flex md:flex-col ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight text-primary">
            wtw
          </span>
        )}
        {/* Collapse toggle — visible on tablet (md) and up */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-[0_0_0_3px_var(--amber-glow)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${
              collapsed ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>
      <nav className="flex flex-1 flex-col space-y-1 p-3">
        <div className="flex-1 space-y-1">
          {collapsed ? (
            <>
              <NavLink href="/" label="R" title="Ready to Watch" count={counts.ready} />
              <NavLink href="/almost-ready" label="A" title="Almost Ready" count={counts.almostReady} />
              <NavLink href="/languages" label="L" title="Languages" />
              <NavLink href="/continue" label="C" title="Continue Watching" count={counts.continue} />
            </>
          ) : (
            <>
              <NavLink href="/" label="Ready to Watch" count={counts.ready} />
              <NavLink href="/almost-ready" label="Almost Ready" count={counts.almostReady} />
              <NavLink href="/languages" label="Languages" />
              <NavLink href="/continue" label="Continue Watching" count={counts.continue} />
            </>
          )}
        </div>
        <div className="border-t border-border pt-2">
          {collapsed ? (
            <NavLink href="/settings" label="" title="Settings" icon={<Settings className="h-4 w-4" />} />
          ) : (
            <NavLink href="/settings" label="Settings" icon={<Settings className="h-4 w-4" />} />
          )}
        </div>
      </nav>
    </aside>
  );
}
