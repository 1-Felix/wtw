"use client";

import { useEffect, useState } from "react";

export function ConfigWarningBanner() {
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setError(data.rulesConfigError ?? null);
      } catch {
        // ignore
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!error || dismissed) return null;

  return (
    <div className="flex items-start gap-3 border-b border-amber-muted bg-amber-glow px-4 py-3 text-sm">
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
      <div className="flex-1">
        <p className="font-medium text-primary">Invalid rules configuration</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Your rules.json file has errors. Default rules are being used.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-[0_0_0_3px_var(--amber-glow)]"
        aria-label="Dismiss warning"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
