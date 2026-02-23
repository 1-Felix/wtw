"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSyncReady } from "@/hooks/use-sync-ready";
import { SyncGuardSpinner } from "@/components/sync-guard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTitle } from "@/components/page-title";

// --- Types ---

interface SeriesInfo {
  id: string;
  title: string;
  seasonCount: number;
  audioLanguages: string[];
  subtitleLanguages: string[];
  /** Audio languages where at least one episode with a file is missing that language */
  incompleteLanguages: string[];
}

interface LanguageCatalog {
  audio: string[];
  subtitle: string[];
}

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

// Sentinel value for "Any" filter option
const ANY = "__any__";

export default function LanguagesPage() {
  const syncReady = useSyncReady();

  const [seriesList, setSeriesList] = useState<SeriesInfo[]>([]);
  const [catalog, setCatalog] = useState<LanguageCatalog>({
    audio: [],
    subtitle: [],
  });
  const [targetLanguage, setTargetLanguage] = useState<string>("");

  // Filters
  const [search, setSearch] = useState("");
  const [audioFilter, setAudioFilter] = useState(ANY);
  const [subtitleFilter, setSubtitleFilter] = useState(ANY);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  // Expansion + language data cache
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null);
  const [languageData, setLanguageData] = useState<LanguageData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const languageCache = useRef(new Map<string, LanguageData>());

  // Fetch series list + language catalog + settings on mount
  useEffect(() => {
    if (!syncReady) return;

    const load = async () => {
      try {
        const [mediaRes, catalogRes, settingsRes] = await Promise.all([
          fetch("/api/media"),
          fetch("/api/languages"),
          fetch("/api/settings"),
        ]);
        const [mediaData, catalogData, settingsData] = await Promise.all([
          mediaRes.json(),
          catalogRes.json(),
          settingsRes.json(),
        ]);

        // Build unique series from all seasons
        const seriesMap = new Map<
          string,
          {
            title: string;
            seasons: Set<number>;
            audio: Set<string>;
            subtitle: Set<string>;
            incomplete: Set<string>;
          }
        >();

        const allSeasons = [
          ...mediaData.ready.seasons,
          ...mediaData.almostReady.seasons,
        ];

        for (const season of allSeasons) {
          const existing = seriesMap.get(season.seriesId);
          if (existing) {
            existing.seasons.add(season.seasonNumber);
            for (const lang of season.seriesAudioLanguages ?? []) {
              existing.audio.add(lang);
            }
            for (const lang of season.seriesSubtitleLanguages ?? []) {
              existing.subtitle.add(lang);
            }
            for (const lang of season.seriesIncompleteLanguages ?? []) {
              existing.incomplete.add(lang);
            }
          } else {
            seriesMap.set(season.seriesId, {
              title: season.seriesTitle,
              seasons: new Set([season.seasonNumber]),
              audio: new Set(season.seriesAudioLanguages ?? []),
              subtitle: new Set(season.seriesSubtitleLanguages ?? []),
              incomplete: new Set(season.seriesIncompleteLanguages ?? []),
            });
          }
        }

        const list: SeriesInfo[] = Array.from(seriesMap.entries())
          .map(([id, info]) => ({
            id,
            title: info.title,
            seasonCount: info.seasons.size,
            audioLanguages: [...info.audio].sort(),
            subtitleLanguages: [...info.subtitle].sort(),
            incompleteLanguages: [...info.incomplete].sort(),
          }))
          .sort((a, b) => a.title.localeCompare(b.title));

        setSeriesList(list);
        setCatalog(catalogData);
        if (settingsData.languageTarget) {
          setTargetLanguage(settingsData.languageTarget);
        }
      } catch {
        toast.error("Couldn't load series list");
      }
    };
    load();
  }, [syncReady]);

  // Fetch language detail when a series is expanded (with cache)
  const handleToggle = useCallback(
    (seriesId: string) => {
      if (expandedSeriesId === seriesId) {
        // Collapse
        setExpandedSeriesId(null);
        setLanguageData(null);
        return;
      }

      setExpandedSeriesId(seriesId);

      // Check cache first
      const cached = languageCache.current.get(seriesId);
      if (cached) {
        setLanguageData(cached);
        setLoadingDetail(false);
        return;
      }

      setLanguageData(null);
      setLoadingDetail(true);
      fetch(`/api/media/${seriesId}/languages`)
        .then((res) => res.json())
        .then((data: LanguageData) => {
          languageCache.current.set(seriesId, data);
          setLanguageData(data);
          setLoadingDetail(false);
        })
        .catch(() => {
          toast.error("Couldn't load language data");
          setLoadingDetail(false);
        });
    },
    [expandedSeriesId],
  );

  // Resolved target language for the "only show incomplete" filter.
  // Lifted out of the memo so it can be displayed in the UI.
  const incompleteTarget =
    audioFilter !== ANY ? audioFilter : targetLanguage || null;

  // Filter series list
  const filteredSeries = useMemo(() => {
    const searchLower = search.toLowerCase();

    return seriesList.filter((s) => {
      // Text search
      if (searchLower && !s.title.toLowerCase().includes(searchLower)) {
        return false;
      }
      // Audio language filter
      if (audioFilter !== ANY && !s.audioLanguages.includes(audioFilter)) {
        return false;
      }
      // Subtitle language filter
      if (
        subtitleFilter !== ANY &&
        !s.subtitleLanguages.includes(subtitleFilter)
      ) {
        return false;
      }
      // Incomplete filter: show only series where at least one episode with a
      // file is missing the target audio language. The server computes this at
      // episode granularity and provides `incompleteLanguages` per series.
      // A series that doesn't have the language at all is also incomplete.
      if (onlyIncomplete && incompleteTarget) {
        const isMissing = !s.audioLanguages.includes(incompleteTarget);
        const isPartial = s.incompleteLanguages.includes(incompleteTarget);
        if (!isMissing && !isPartial) return false;
      }
      return true;
    });
  }, [seriesList, search, audioFilter, subtitleFilter, onlyIncomplete, incompleteTarget]);

  if (!syncReady) {
    return <SyncGuardSpinner />;
  }

  return (
    <div>
      <PageTitle>Language Overview</PageTitle>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search series..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[140px]">
            <Select value={audioFilter} onValueChange={setAudioFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Audio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Audio: Any</SelectItem>
                {catalog.audio.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[140px]">
            <Select value={subtitleFilter} onValueChange={setSubtitleFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Subtitles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Subtitles: Any</SelectItem>
                {catalog.subtitle.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyIncomplete}
                onChange={(e) => setOnlyIncomplete(e.target.checked)}
                disabled={!incompleteTarget}
                className="rounded border-border accent-primary disabled:opacity-50"
              />
              Only show incomplete
            </label>
            <span className="text-[11px] text-muted-foreground/70">
              {incompleteTarget
                ? `(Checking: ${incompleteTarget})`
                : "(Set a target language in Settings)"}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {filteredSeries.length} of {seriesList.length} series
        </p>
      </div>

      {/* Series list */}
      {filteredSeries.length === 0 && (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {seriesList.length === 0
              ? "No series available. Sync media first."
              : onlyIncomplete && incompleteTarget
                ? `All series are complete for ${incompleteTarget}.`
                : "No series match the current filters."}
          </p>
        </div>
      )}

      <div className="space-y-1">
        {filteredSeries.map((series) => {
          const isExpanded = expandedSeriesId === series.id;

          return (
            <div key={series.id}>
              {/* Series card */}
              <button
                onClick={() => handleToggle(series.id)}
                className="flex w-full items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface/80"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {series.title}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {series.seasonCount}{" "}
                    {series.seasonCount === 1 ? "season" : "seasons"}
                    {series.audioLanguages.length > 0 && (
                      <>
                        {" "}
                        &middot; Audio: {series.audioLanguages.join(", ")}
                      </>
                    )}
                    {series.subtitleLanguages.length > 0 && (
                      <>
                        {" "}
                        &middot; Sub: {series.subtitleLanguages.join(", ")}
                      </>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="ml-7 mt-1 mb-2 rounded-md border border-border/50 bg-card p-4">
                  {loadingDetail && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}

                  {!loadingDetail && !languageData && (
                    <p className="text-sm text-muted-foreground">
                      No language data available for this series.
                    </p>
                  )}

                  {!loadingDetail && languageData && (
                    <LanguageGrid
                      data={languageData}
                      highlightAudioLang={
                        audioFilter !== ANY ? audioFilter : undefined
                      }
                      highlightSubtitleLang={
                        subtitleFilter !== ANY ? subtitleFilter : undefined
                      }
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Language Grid sub-component ---

function LanguageGrid({
  data,
  highlightAudioLang,
  highlightSubtitleLang,
}: {
  data: LanguageData;
  highlightAudioLang?: string;
  highlightSubtitleLang?: string;
}) {
  return (
    <div className="space-y-6">
      {data.seasons.map((season) => {
        const allSubtitleLangs = new Set<string>();
        for (const ep of season.episodes) {
          for (const lang of ep.subtitles) {
            allSubtitleLangs.add(lang);
          }
        }
        const subtitleLanguages = Array.from(allSubtitleLangs).sort();
        const hasAnyData =
          season.languages.length > 0 || subtitleLanguages.length > 0;

        // Determine whether to apply column de-emphasis.
        // If the highlighted language isn't present in this season, skip
        // de-emphasis entirely (all columns stay full opacity).
        const applyAudioDim =
          highlightAudioLang != null &&
          season.languages.includes(highlightAudioLang);
        const applySubDim =
          highlightSubtitleLang != null &&
          subtitleLanguages.includes(highlightSubtitleLang);

        return (
          <section key={season.seasonNumber}>
            <h4 className="mb-2 text-xs font-semibold text-foreground">
              {season.title}
            </h4>

            {!hasAnyData ? (
              <p className="text-xs text-muted-foreground">
                No language information available.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                        Episode
                      </th>
                      {season.languages.length > 0 && (
                        <th
                          colSpan={season.languages.length}
                          className="border-b border-border/30 px-2 py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          Audio
                        </th>
                      )}
                      {subtitleLanguages.length > 0 && (
                        <th
                          colSpan={subtitleLanguages.length}
                          className="border-b border-border/30 px-2 py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          Subtitles
                        </th>
                      )}
                    </tr>
                    <tr className="border-b border-border">
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground" />
                      {season.languages.map((lang) => {
                        const dimmed =
                          applyAudioDim && lang !== highlightAudioLang;
                        return (
                          <th
                            key={`audio-${lang}`}
                            className={`px-2 py-1.5 text-center font-medium text-muted-foreground${dimmed ? " opacity-30" : ""}`}
                          >
                            {lang}
                          </th>
                        );
                      })}
                      {subtitleLanguages.map((lang) => {
                        const dimmed =
                          applySubDim && lang !== highlightSubtitleLang;
                        return (
                          <th
                            key={`sub-${lang}`}
                            className={`px-2 py-1.5 text-center font-medium text-muted-foreground/70${dimmed ? " opacity-30" : ""}`}
                          >
                            {lang}
                          </th>
                        );
                      })}
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
                          <td className="px-2 py-1.5 text-foreground">
                            <span className="font-mono text-muted-foreground">
                              {String(ep.episodeNumber).padStart(2, "0")}
                            </span>{" "}
                            {ep.title}
                          </td>
                          {season.languages.map((lang) => {
                            const dimmed =
                              applyAudioDim && lang !== highlightAudioLang;
                            return (
                              <td
                                key={`audio-${lang}`}
                                className={`px-2 py-1.5 text-center${dimmed ? " opacity-30" : ""}`}
                              >
                                {ep.languages[lang] ? (
                                  <span className="inline-block h-3 w-3 rounded-sm bg-primary" />
                                ) : (
                                  <span className="inline-block h-3 w-3 rounded-sm bg-muted" />
                                )}
                              </td>
                            );
                          })}
                          {subtitleLanguages.map((lang) => {
                            const dimmed =
                              applySubDim && lang !== highlightSubtitleLang;
                            return (
                              <td
                                key={`sub-${lang}`}
                                className={`px-2 py-1.5 text-center${dimmed ? " opacity-30" : ""}`}
                              >
                                {epSubtitleSet.has(lang) ? (
                                  <span className="inline-block h-3 w-3 rounded-sm bg-primary/60" />
                                ) : (
                                  <span className="inline-block h-3 w-3 rounded-sm bg-muted" />
                                )}
                              </td>
                            );
                          })}
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
  );
}
