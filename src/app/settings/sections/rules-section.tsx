"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RulesConfig } from "../schemas";

const compositionModes = ["and", "or"] as const;

function isCompositionMode(value: string): value is RulesConfig["compositionMode"] {
  return (compositionModes as readonly string[]).includes(value);
}

function getThresholdExplanation(
  enabledCount: number,
  thresholdPercent: number,
): string {
  if (enabledCount === 0) {
    return "No rules enabled \u2014 all items are Ready";
  }

  if (enabledCount === 1) {
    return "With 1 rule enabled: items are either Ready or Not Ready";
  }

  if (thresholdPercent === 0) {
    return "All non-ready items will appear as Almost Ready";
  }

  if (thresholdPercent >= 100) {
    return "No Almost Ready category \u2014 items are either Ready or Not Ready";
  }

  // Progress is a weighted average across rules (e.g. 9/10 episodes + 1/1 language = 10/11 ≈ 91%).
  // Show the threshold as a concrete percentage that progress must reach.
  return `Items that are at least ${thresholdPercent}% complete across ${enabledCount} rules will appear as Almost Ready`;
}

export function RulesSection({
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

  const hasLanguageOptions = audioLanguages.length > 0;

  const toggleRule = (key: keyof RulesConfig["rules"]) => {
    onChange({
      ...config,
      rules: { ...config.rules, [key]: !config.rules[key] },
    });
  };

  const rules = [
    {
      key: "completeSeason" as const,
      label: "Complete Season",
      description: "Require all aired episodes to be available",
    },
    {
      key: "languageAvailable" as const,
      label: "Language Available",
      description: "Require target audio language on all episodes",
    },
    {
      key: "fullyMonitored" as const,
      label: "Fully Monitored",
      description: "Require all episodes to be monitored in Sonarr",
    },
  ];

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Readiness Rules
      </h3>
      {rules.map((rule) => (
        <div
          key={rule.key}
          className="rounded-md border border-border bg-surface p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {rule.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {rule.description}
              </p>
            </div>
            <Switch
              size="lg"
              checked={config.rules[rule.key]}
              onCheckedChange={() => toggleRule(rule.key)}
            />
          </div>

          {/* Inline language picker — shown when Language Available is enabled */}
          {rule.key === "languageAvailable" && config.rules.languageAvailable && (
            <div className="mt-3 border-t border-border pt-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Target Audio Language
              </label>
              {catalogLoading ? (
                <div className="h-9 max-w-xs animate-pulse rounded-md bg-muted" />
              ) : hasLanguageOptions ? (
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
          )}
        </div>
      ))}

      <Separator className="my-2" />

      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        How Rules Combine
      </h3>

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
          onValueChange={(value) => {
            if (isCompositionMode(value)) {
              onChange({ ...config, compositionMode: value });
            }
          }}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">AND &mdash; All rules must pass</SelectItem>
            <SelectItem value="or">OR &mdash; Any rule can pass</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Almost Ready Threshold */}
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
        <p className="mt-3 text-xs text-muted-foreground">
          {getThresholdExplanation(
            [config.rules.completeSeason, config.rules.languageAvailable, config.rules.fullyMonitored].filter(Boolean).length,
            Math.round(config.almostReadyThreshold * 100),
          )}
        </p>
      </div>

      <Separator className="my-2" />

      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Behavior
      </h3>
      <div className="flex items-center justify-between rounded-md border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            Hide Watched Items
          </p>
          <p className="text-xs text-muted-foreground">
            Exclude fully-watched seasons and movies from dashboard views
          </p>
        </div>
        <Switch
          size="lg"
          checked={config.hideWatched}
          onCheckedChange={() =>
            onChange({ ...config, hideWatched: !config.hideWatched })
          }
        />
      </div>
    </section>
  );
}
