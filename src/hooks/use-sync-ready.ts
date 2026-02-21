"use client";

import { useEffect, useState } from "react";

/**
 * Client-side hook that polls `/api/health` while the initial sync
 * is in progress. Returns `true` once the sync has completed (phase
 * is no longer "initializing"), or `false` while still waiting.
 *
 * This is the client-side counterpart of the server-side `<SyncGuard>`
 * component — use it in client pages that need to fetch data after
 * the sync completes.
 */
export function useSyncReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/health");
        const health = await res.json();
        if (cancelled) return;

        if (health.phase === "initializing") {
          pollTimer = setTimeout(poll, 3000);
        } else {
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true); // assume ready on error to avoid infinite spinner
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, []);

  return ready;
}
