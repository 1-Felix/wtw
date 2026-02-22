"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSyncReady } from "@/hooks/use-sync-ready";
import { SyncGuardSpinner } from "@/components/sync-guard";

interface LanguageData {
  seriesId: string;
  seriesTitle: string;
  seasons: Array<{
    seasonNumber: number;
    title: string;
    languages: string[];
    episodes: Array<{
      episodeNumber: number;
      title: string;
      hasFile: boolean;
      languages: Record<string, boolean>;
      subtitles: string[];
    }>;
  }>;
}

export default function LanguagesPage() {
  const syncReady = useSyncReady();
  const [seriesList, setSeriesList] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [languageData, setLanguageData] = useState<LanguageData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch series list once sync is ready
  useEffect(() => {
    if (!syncReady) return;

    const load = async () => {
      try {
        const res = await fetch("/api/media");
        const data = await res.json();
        const allSeries = new Map<string, string>();
        for (const season of [
          ...data.ready.seasons,
          ...data.almostReady.seasons,
        ]) {
          allSeries.set(season.seriesId, season.seriesTitle);
        }
        setSeriesList(
          Array.from(allSeries.entries()).map(([id, title]) => ({
            id,
            title,
          }))
        );
      } catch {
        toast.error("Couldn't load series list");
      }
    };
    load();
  }, [syncReady]);

  // Fetch language data when series is selected
  useEffect(() => {
    if (!selectedSeriesId) return;
    setLoading(true);
    fetch(`/api/media/${selectedSeriesId}/languages`)
      .then((res) => res.json())
      .then((data: LanguageData) => {
        setLanguageData(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Couldn't load language data");
        setLoading(false);
      });
  }, [selectedSeriesId]);

  if (!syncReady) {
    return <SyncGuardSpinner />;
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold tracking-tight">
        Language Overview
      </h2>

      {/* Series selector */}
      <div className="mb-6">
        <select
          value={selectedSeriesId ?? ""}
          onChange={(e) =>
            setSelectedSeriesId(e.target.value || null)
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="">Select a series...</option>
          {seriesList
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && !languageData && selectedSeriesId && (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No language data available for this series.
          </p>
        </div>
      )}

      {!loading && !selectedSeriesId && (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Select a series to view its language breakdown.
          </p>
        </div>
      )}

      {!loading && languageData && (
        <div className="space-y-8">
          {languageData.seasons.map((season) => {
            // Collect all unique subtitle languages across episodes
            const allSubtitleLangs = new Set<string>();
            for (const ep of season.episodes) {
              for (const lang of ep.subtitles) {
                allSubtitleLangs.add(lang);
              }
            }
            const subtitleLanguages = Array.from(allSubtitleLangs).sort();
            const hasAnyData =
              season.languages.length > 0 || subtitleLanguages.length > 0;

            return (
              <section key={season.seasonNumber}>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {season.title}
                </h3>

                {!hasAnyData ? (
                  <p className="text-sm text-muted-foreground">
                    No language information available.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Episode
                          </th>
                          {season.languages.length > 0 && (
                            <th
                              colSpan={season.languages.length}
                              className="border-b border-border/30 px-3 py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                            >
                              Audio
                            </th>
                          )}
                          {subtitleLanguages.length > 0 && (
                            <th
                              colSpan={subtitleLanguages.length}
                              className="border-b border-border/30 px-3 py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                            >
                              Subtitles
                            </th>
                          )}
                        </tr>
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground" />
                          {season.languages.map((lang) => (
                            <th
                              key={`audio-${lang}`}
                              className="px-3 py-2 text-center font-medium text-muted-foreground"
                            >
                              {lang}
                            </th>
                          ))}
                          {subtitleLanguages.map((lang) => (
                            <th
                              key={`sub-${lang}`}
                              className="px-3 py-2 text-center font-medium text-muted-foreground/70"
                            >
                              {lang}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {season.episodes.map((ep) => {
                          const epSubtitleSet = new Set(ep.subtitles);
                          return (
                            <tr
                              key={ep.episodeNumber}
                              className="border-b border-border/50"
                            >
                              <td className="px-3 py-2 text-foreground">
                                <span className="font-mono text-muted-foreground">
                                  {String(ep.episodeNumber).padStart(
                                    2,
                                    "0"
                                  )}
                                </span>{" "}
                                {ep.title}
                              </td>
                              {season.languages.map((lang) => (
                                <td
                                  key={`audio-${lang}`}
                                  className="px-3 py-2 text-center"
                                >
                                  {ep.languages[lang] ? (
                                    <span className="inline-block h-3 w-3 rounded-sm bg-primary" />
                                  ) : (
                                    <span className="inline-block h-3 w-3 rounded-sm bg-muted" />
                                  )}
                                </td>
                              ))}
                              {subtitleLanguages.map((lang) => (
                                <td
                                  key={`sub-${lang}`}
                                  className="px-3 py-2 text-center"
                                >
                                  {epSubtitleSet.has(lang) ? (
                                    <span className="inline-block h-3 w-3 rounded-sm bg-primary/60" />
                                  ) : (
                                    <span className="inline-block h-3 w-3 rounded-sm bg-muted" />
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
