"use client";

import { useEffect, useState } from "react";
import { PosterImage } from "@/components/poster-image";
import { ProgressBar } from "@/components/progress-bar";

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

export default function ContinueWatchingPage() {
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/media/continue")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold tracking-tight">
        Continue Watching
      </h2>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
