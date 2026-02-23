import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a future air date as a concise label (e.g., "Mar 15", "in 3 days", "Tomorrow"). */
export function formatAirDate(dateString: string): string {
  const now = new Date();
  const airDate = new Date(dateString);
  const diffMs = airDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    // Already aired or airing today
    return "Today";
  }
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `in ${diffDays} days`;

  // Show month and day for dates further out
  return airDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format a date string as a human-readable relative time (e.g., "3 days ago"). */
export function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
  }
  if (diffDays > 0) return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  if (diffHours > 0) return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  if (diffMinutes > 0) return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  return "just now";
}
