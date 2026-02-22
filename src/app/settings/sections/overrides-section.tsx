"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { RulesConfig } from "../schemas";

interface SeriesInfo {
  id: string;
  title: string;
  tvdbId?: string;
}

export function OverridesSection({
  config,
  onChange,
}: {
  config: RulesConfig;
  onChange: (c: RulesConfig) => void;
}) {
  const [seriesList, setSeriesList] = useState<SeriesInfo[]>([]);
  const [newKey, setNewKey] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const entries = Object.entries(config.overrides);
  const existingKeys = new Set(Object.keys(config.overrides));

  // Fetch series list for the picker
  useEffect(() => {
    fetch("/api/series")
      .then((r) => r.json())
      .then((data: { series: SeriesInfo[] }) => {
        setSeriesList(data.series ?? []);
      })
      .catch(() => {
        // Silently fail — picker will just be empty
      });
  }, []);

  // Filter suggestions: match query, exclude already-overridden series
  const allMatches = newKey.trim()
    ? seriesList.filter(
        (s) =>
          s.title.toLowerCase().includes(newKey.toLowerCase()) &&
          !existingKeys.has(s.title)
      )
    : [];
  const suggestions = allMatches.slice(0, 10);
  const moreCount = allMatches.length - suggestions.length;

  const selectSeries = useCallback(
    (title: string) => {
      onChange({
        ...config,
        overrides: {
          ...config.overrides,
          [title]: { disabledRules: [], languageTarget: undefined },
        },
      });
      setNewKey("");
      setShowDropdown(false);
      setHighlightIndex(-1);
    },
    [config, onChange]
  );

  const addOverride = () => {
    if (!newKey.trim()) return;
    selectSeries(newKey.trim());
  };

  const removeOverride = (key: string) => {
    const next = { ...config.overrides };
    delete next[key];
    onChange({ ...config, overrides: next });
  };

  const toggleRule = (key: string, rule: string) => {
    const current = config.overrides[key];
    const disabledRules = current.disabledRules ?? [];
    const next = disabledRules.includes(rule)
      ? disabledRules.filter((r) => r !== rule)
      : [...disabledRules, rule];
    onChange({
      ...config,
      overrides: {
        ...config.overrides,
        [key]: { ...current, disabledRules: next },
      },
    });
  };

  const setLanguage = (key: string, lang: string) => {
    onChange({
      ...config,
      overrides: {
        ...config.overrides,
        [key]: {
          ...config.overrides[key],
          languageTarget: lang || undefined,
        },
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === "Enter") {
        addOverride();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
          selectSeries(suggestions[highlightIndex].title);
        } else if (newKey.trim()) {
          addOverride();
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setHighlightIndex(-1);
        break;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Resolve override key to display label
  const resolveOverrideLabel = (key: string) => {
    // Check if the key matches a series title directly
    const byTitle = seriesList.find((s) => s.title === key);
    if (byTitle) return { label: key, matched: true };

    // Check if the key is a TVDB ID
    const byTvdb = seriesList.find((s) => s.tvdbId === key);
    if (byTvdb) return { label: `${byTvdb.title} (TVDB: ${key})`, matched: true };

    // Unmatched key
    return { label: key, matched: false };
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Per-Series Overrides
      </h3>

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No overrides configured.</p>
      )}

      {entries.map(([key, override]) => {
        const { label, matched } = resolveOverrideLabel(key);
        return (
          <div
            key={key}
            className="rounded-md border border-border bg-surface p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {label}
                {!matched && seriesList.length > 0 && (
                  <span className="ml-2 text-[10px] text-muted-foreground/60">
                    (unmatched)
                  </span>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeOverride(key)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {["complete-season", "language-available", "fully-monitored"].map(
                  (rule) => {
                    const isDisabled = (override.disabledRules ?? []).includes(
                      rule
                    );
                    return (
                      <button
                        key={rule}
                        onClick={() => toggleRule(key, rule)}
                        className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                          isDisabled
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {rule} {isDisabled ? "(disabled)" : "(enabled)"}
                      </button>
                    );
                  }
                )}
              </div>
              <Input
                value={override.languageTarget ?? ""}
                onChange={(e) => setLanguage(key, e.target.value)}
                placeholder="Language override (empty = use global)"
                className="h-8 text-xs"
              />
            </div>
          </div>
        );
      })}

      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newKey}
            onChange={(e) => {
              setNewKey(e.target.value);
              setShowDropdown(true);
              setHighlightIndex(-1);
            }}
            onFocus={() => {
              if (newKey.trim()) setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search series or type a name..."
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={addOverride}
            disabled={!newKey.trim()}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Dropdown suggestions */}
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-12 z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-surface shadow-lg"
          >
            {suggestions.map((s, i) => (
              <button
                key={s.id}
                className={`w-full px-3 py-2 text-left text-sm ${
                  i === highlightIndex
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSeries(s.title);
                }}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                {s.title}
              </button>
            ))}
            {moreCount > 0 && (
              <div className="px-3 py-1.5 text-xs text-muted-foreground/60">
                {moreCount} more result{moreCount !== 1 ? "s" : ""}...
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
