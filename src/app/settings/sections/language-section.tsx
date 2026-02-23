"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { RulesConfig } from "../schemas";

const compositionModes = ["and", "or"] as const;

function isCompositionMode(value: string): value is RulesConfig["compositionMode"] {
  return (compositionModes as readonly string[]).includes(value);
}

export function LanguageSection({
  config,
  onChange,
}: {
  config: RulesConfig;
  onChange: (c: RulesConfig) => void;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Language & Threshold
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
        <p className="mt-3 text-xs text-muted-foreground/70">
          Progress is calculated as the proportion of enabled readiness rules
          that pass. For example, if 2 of 3 enabled rules pass, progress is 67%.
        </p>
      </div>
    </section>
  );
}
