"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CircleCheck } from "lucide-react";
import { PosterImage } from "@/components/poster-image";
import { ProgressBar } from "@/components/progress-bar";
import { useSyncReady } from "@/hooks/use-sync-ready";
import { SyncGuardSpinner } from "@/components/sync-guard";
import { PageTitle } from "@/components/page-title";

interface ContinueItem {
  type: "episode" | "movie";
  id: string;
  posterImageId: string | null;
  playbackProgress: number;
  lastPlayed: string | null;
  // Episode fields
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  // Movie fields
  title?: string;
  year?: number | null;
}

function getItemLabel(item: ContinueItem): string {
  if (item.type === "episode") {
    return `${item.seriesTitle} S${String(item.seasonNumber).padStart(2, "0")}E${String(item.episodeNumber).padStart(2, "0")}`;
  }
  return item.title ?? "Movie";
}

export default function ContinueWatchingPage() {
  const syncReady = useSyncReady();
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  // Track items removed for undo — keyed by item id, value is { item, index }
  const pendingUndoRef = useRef<Map<string, { item: ContinueItem; index: number }>>(new Map());

  useEffect(() => {
    if (!syncReady) return;

    const load = async () => {
      try {
        const res = await fetch("/api/media/continue");
        const data = await res.json();
        setItems(data.items);
      } catch {
        toast.error("Couldn't load continue watching data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [syncReady]);

  const handleMarkWatched = useCallback(async (item: ContinueItem) => {
    const label = getItemLabel(item);

    // Set loading state on this button
    setMarkingIds((prev) => new Set(prev).add(item.id));

    try {
      const res = await fetch(`/api/media/${item.id}/watched`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as Record<string, unknown>).error as string ?? "Failed to mark as watched"
        );
      }

      // Optimistically remove item from list
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id);
        if (idx !== -1) {
          pendingUndoRef.current.set(item.id, { item, index: idx });
        }
        return prev.filter((i) => i.id !== item.id);
      });

      // Show undo toast
      toast(`Marked "${label}" as watched`, {
        action: {
          label: "Undo",
          onClick: () => handleUndo(item.id),
        },
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to mark as watched"
      );
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, []);

  const handleUndo = useCallback(async (itemId: string) => {
    const pending = pendingUndoRef.current.get(itemId);
    if (!pending) return;

    try {
      const res = await fetch(`/api/media/${itemId}/watched`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: false }),
      });

      if (!res.ok) {
        throw new Error("Failed to undo");
      }

      // Re-insert the item at its original position
      pendingUndoRef.current.delete(itemId);
      setItems((prev) => {
        const next = [...prev];
        const insertIdx = Math.min(pending.index, next.length);
        next.splice(insertIdx, 0, pending.item);
        return next;
      });
    } catch {
      toast.error("Failed to undo — item may need a manual sync");
    }
  }, []);

  if (!syncReady || loading) {
    return <SyncGuardSpinner />;
  }

  return (
    <div>
      <PageTitle>Continue Watching</PageTitle>

      {items.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Nothing in progress. Start watching something!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-md border border-border bg-card p-3 transition-colors hover:border-primary/30"
            >
              {/* Poster thumbnail */}
              <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-sm">
                <PosterImage
                  itemId={item.posterImageId}
                  title={
                    item.type === "episode"
                      ? (item.seriesTitle ?? "")
                      : (item.title ?? "")
                  }
                  className="h-full w-full"
                />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                {item.type === "episode" ? (
                  <>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.seriesTitle}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      S{String(item.seasonNumber).padStart(2, "0")}E
                      {String(item.episodeNumber).padStart(2, "0")} &middot;{" "}
                      {item.episodeTitle}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.year ?? ""}
                    </p>
                  </>
                )}
                <ProgressBar
                  value={item.playbackProgress}
                  className="mt-1.5"
                />
              </div>

              {/* Progress percentage */}
              <span className="shrink-0 text-xs font-mono text-muted-foreground">
                {Math.round(item.playbackProgress * 100)}%
              </span>

              {/* Mark as watched button */}
              <button
                type="button"
                onClick={() => handleMarkWatched(item)}
                disabled={markingIds.has(item.id)}
                title="Mark as watched"
                className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
              >
                <CircleCheck className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
