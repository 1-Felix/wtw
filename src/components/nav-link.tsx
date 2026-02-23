"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
  title?: string;
  count?: number;
  collapsed?: boolean;
}

export function NavLink({
  href,
  label,
  icon,
  title,
  count,
  collapsed,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  const displayCount = count != null && count > 0 ? (count > 99 ? "99+" : count) : null;

  // Collapsed mode: icon with superscript badge overlay
  if (collapsed) {
    return (
      <Link
        href={href}
        title={title ?? label}
        aria-current={isActive ? "page" : undefined}
        aria-label={
          displayCount != null
            ? `${title ?? label}, ${count} items`
            : title ?? label
        }
        className={`relative flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
      >
        {icon}
        {displayCount != null && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 py-px text-[9px] font-bold leading-none text-primary-foreground">
            {displayCount}
          </span>
        )}
      </Link>
    );
  }

  // Expanded mode: label with inline pill
  return (
    <Link
      href={href}
      title={title}
      aria-current={isActive ? "page" : undefined}
      aria-label={
        displayCount != null ? `${label}, ${count} items` : undefined
      }
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}
    >
      {icon}
      {label && <span className="flex-1">{label}</span>}
      {displayCount != null && (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">
          {displayCount}
        </span>
      )}
    </Link>
  );
}
