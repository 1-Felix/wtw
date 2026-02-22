"use client";

import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { RulesConfig } from "../schemas";

export function RulesSection({
  config,
  onChange,
}: {
  config: RulesConfig;
  onChange: (c: RulesConfig) => void;
}) {
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
          className="flex items-center justify-between rounded-md border border-border bg-surface p-4"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{rule.label}</p>
            <p className="text-xs text-muted-foreground">{rule.description}</p>
          </div>
          <Switch
            size="lg"
            checked={config.rules[rule.key]}
            onCheckedChange={() => toggleRule(rule.key)}
          />
        </div>
      ))}

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
