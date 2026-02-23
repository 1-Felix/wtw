"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { RulesConfig } from "../schemas";

export function LanguageSection({
  config,
  onChange,
}: {
  config: RulesConfig;
  onChange: (c: RulesConfig) => void;
}) {
  const [audioLanguages, setAudioLanguages] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Fetch available languages from media catalog
  useEffect(() => {
    fetch("/api/languages")
      .then((res) => res.json())
      .then((data: { audio: string[]; subtitle: string[] }) => {
        setAudioLanguages(data.audio);
      })
      .catch(() => {
        // Silently fail — dropdown will be empty
      })
      .finally(() => setCatalogLoading(false));
  }, []);

  const hasOptions = audioLanguages.length > 0;

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Language & Threshold
      </h3>

      {/* Language Target */}
      <div className="rounded-md border border-border bg-surface p-4">
        <label className="mb-1 block text-sm font-medium text-foreground">
          Target Audio Language
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          Audio language required when the language rule is enabled
        </p>
        {catalogLoading ? (
          <div className="h-9 max-w-xs animate-pulse rounded-md bg-muted" />
        ) : hasOptions ? (
          <Select
            value={config.languageTarget}
            onValueChange={(value) =>
              onChange({ ...config, languageTarget: value })
            }
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              {audioLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="max-w-xs">
            <Select disabled>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Sync media first" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__empty__" disabled>
                  No languages available
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Languages will be available after media is synced.
            </p>
          </div>
        )}
      </div>

      {/* Composition Mode */}
      <div className="rounded-md border border-border bg-surface p-4">
        <label className="mb-1 block text-sm font-medium text-foreground">
          Composition Mode
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          How enabled rules are combined to determine readiness
        </p>
        <Select
          value={config.compositionMode}
          onValueChange={(value) =>
            onChange({
              ...config,
              compositionMode: value as "and" | "or",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">AND — All rules must pass</SelectItem>
            <SelectItem value="or">OR — Any rule can pass</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Threshold Slider */}
      <div className="rounded-md border border-border bg-surface p-4">
        <label className="mb-1 block text-sm font-medium text-foreground">
          Almost Ready Threshold:{" "}
          <span className="text-primary">
            {Math.round(config.almostReadyThreshold * 100)}%
          </span>
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          Items with progress above this threshold appear as &ldquo;Almost
          Ready&rdquo;
        </p>
        <Slider
          value={[Math.round(config.almostReadyThreshold * 100)]}
          onValueChange={(value) =>
            onChange({
              ...config,
              almostReadyThreshold: value[0] / 100,
            })
          }
          min={0}
          max={100}
          step={5}
          className="max-w-xs"
        />
      </div>
    </section>
  );
}
