"use client";

import { useEffect, useState } from "react";

/**
 * Fetches the resolved Jellyfin external URL once and caches it.
 * Returns `null` while loading or if no URL is configured.
 */
export function useJellyfinExternalUrl(): string | null {
  const [externalUrl, setExternalUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUrl() {
      try {
        const res = await fetch("/api/services/jellyfin/external-url");
        if (!res.ok) return;
        const data = (await res.json()) as { externalUrl: string | null };
        if (!cancelled) {
          setExternalUrl(data.externalUrl);
        }
      } catch {
        // Silently ignore — button just won't show
      }
    }

    fetchUrl();

    return () => {
      cancelled = true;
    };
  }, []);

  return externalUrl;
}
