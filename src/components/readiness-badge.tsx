import type { ReadinessStatus } from "@/lib/models/readiness";

interface ReadinessBadgeProps {
  status: ReadinessStatus;
  className?: string;
}

export function ReadinessBadge({ status, className = "" }: ReadinessBadgeProps) {
  const styles: Record<ReadinessStatus, string> = {
    ready: "bg-primary/15 text-primary border-primary/30",
    "almost-ready":
      "bg-gradient-to-r from-amber-600/15 to-orange-500/15 text-amber-400 border-amber-500/30",
    "not-ready": "bg-muted text-muted-foreground border-border",
  };

  const labels: Record<ReadinessStatus, string> = {
    ready: "Ready",
    "almost-ready": "Almost Ready",
    "not-ready": "Not Ready",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[status]} ${className}`}
    >
      {labels[status]}
    </span>
  );
}
