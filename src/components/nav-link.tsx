"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
  title?: string;
  count?: number;
}

export function NavLink({ href, label, icon, title, count }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      title={title}
      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}
    >
      {icon}
      {label && <span>{label}</span>}
      {count != null && count > 0 && (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
