"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RefreshButton() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) return;
        const data = await res.json();
        if (data.phase === "idle" || data.phase === "ready") {
          stopPolling();
          setIsSyncing(false);
          toast.success("Sync complete");
          router.refresh();
        }
      } catch {
        // Polling failure — keep trying silently
      }
    }, 3000);
  }, [stopPolling, router]);

  const handleRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const res = await fetch("/api/sync", { method: "POST" });

      if (res.status === 409) {
        toast.warning("Sync already in progress");
        // Still poll for completion
        startPolling();
        return;
      }

      if (!res.ok) {
        toast.error("Couldn't start sync");
        setIsSyncing(false);
        return;
      }

      toast("Sync started");
      startPolling();
    } catch {
      toast.error("Couldn't start sync");
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
