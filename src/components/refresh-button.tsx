"use client";

import { useState } from "react";

export function RefreshButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      await fetch("/api/sync", { method: "POST" });
      // Wait a bit then reload data
      setTimeout(() => {
        setIsSyncing(false);
        window.location.reload();
      }, 3000);
    } catch {
      setIsSyncing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isSyncing}
      className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground disabled:opacity-50"
    >
      <svg
        className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {isSyncing ? "Syncing..." : "Refresh"}
    </button>
  );
}
