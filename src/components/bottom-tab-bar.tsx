"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tv2, Clock, Globe, Play, Settings } from "lucide-react";
import type { NavCounts } from "@/lib/counts";

interface Tab {
  href: string;
  label: string;
  icon: React.ElementType;
  countKey?: keyof NavCounts;
}

const tabs: Tab[] = [
  { href: "/", label: "Ready", icon: Tv2, countKey: "ready" },
  { href: "/almost-ready", label: "Almost", icon: Clock, countKey: "almostReady" },
  { href: "/languages", label: "Languages", icon: Globe },
  { href: "/continue", label: "Continue", icon: Play, countKey: "continue" },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface BottomTabBarProps {
  counts: NavCounts;
}

export function BottomTabBar({ counts }: BottomTabBarProps) {
  const pathname = usePathname();

  // Hide tab bar during setup to prevent z-index overlap with setup overlay
  if (pathname.startsWith("/setup")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          const count = tab.countKey ? counts[tab.countKey] : 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={count > 0 ? `${tab.label}, ${count} items` : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 py-px text-[9px] font-bold leading-none text-primary-foreground">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span className="truncate">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
