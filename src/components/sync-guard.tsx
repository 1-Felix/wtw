import { getCache } from "@/lib/sync/cache";

interface SyncGuardProps {
  children: React.ReactNode;
}

/**
 * Server component that shows a loading state when the initial sync
 * has not yet completed. Wrap page content to prevent misleading
 * empty states during the first sync after startup.
 */
export function SyncGuard({ children }: SyncGuardProps) {
  const cache = getCache();

  if (cache.syncState.phase === "initializing") {
    return <SyncGuardSpinner />;
  }

  return <>{children}</>;
}

/** Shared loading spinner shown while the initial sync is in progress. */
export function SyncGuardSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Running initial sync...</p>
      </div>
    </div>
  );
}
