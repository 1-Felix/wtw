"use client";

import { useEffect, useState } from "react";

interface ServiceHealth {
  name: string;
  connected: boolean;
  lastSuccess: string | null;
  lastError: string | null;
  lastErrorMessage: string | null;
}

interface HealthData {
  status: string;
  phase: string;
  lastSyncEnd: string | null;
  services: ServiceHealth[];
}

export function HealthIndicator() {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/health");
        const data: HealthData = await res.json();
        setHealth(data);
      } catch {
        // Silent: polling failures shouldn't toast every 10s; the status dot already shows degraded state
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!health) return null;

  const allHealthy = health.services.every((s) => s.connected);
  const isSyncing = health.phase === "syncing";
  const isInitializing = health.phase === "initializing";

  const degradedServices = health.services.filter((s) => !s.connected);

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Status dot */}
      <div className="relative flex h-2.5 w-2.5 items-center justify-center">
        {isSyncing || isInitializing ? (
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
        ) : allHealthy ? (
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
        ) : (
          <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
        )}
      </div>

      {/* Label */}
      <span className="text-muted-foreground">
        {isInitializing
          ? "Initializing..."
          : isSyncing
            ? "Syncing..."
            : degradedServices.length > 0
              ? degradedServices.map((s) => {
                  const lastReachable = s.lastSuccess
                    ? `, last reachable ${formatTimeAgo(s.lastSuccess)}`
                    : "";
                  return `${s.name} unreachable${lastReachable}`;
                }).join("; ")
              : health.lastSyncEnd
                ? `Synced ${formatTimeAgo(health.lastSyncEnd)}`
                : "Ready"}
      </span>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
