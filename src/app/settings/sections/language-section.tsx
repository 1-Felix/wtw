"use client";

import { Input } from "@/components/ui/input";
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
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Language & Threshold
      </h3>

      {/* Language Target */}
      <div className="rounded-md border border-border bg-surface p-4">
        <label className="mb-2 block text-sm font-medium text-foreground">
          Target Audio Language
        </label>
        <Input
          value={config.languageTarget}
          onChange={(e) =>
            onChange({ ...config, languageTarget: e.target.value })
          }
          className="max-w-xs"
          placeholder="English"
        />
      </div>

      {/* Composition Mode */}
      <div className="rounded-md border border-border bg-surface p-4">
        <label className="mb-2 block text-sm font-medium text-foreground">
          Composition Mode
        </label>
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
        <label className="mb-2 block text-sm font-medium text-foreground">
          Almost Ready Threshold:{" "}
          <span className="text-primary">
            {Math.round(config.almostReadyThreshold * 100)}%
          </span>
        </label>
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
        <p className="mt-2 text-xs text-muted-foreground">
          Items with progress above this threshold appear as &ldquo;Almost
          Ready&rdquo;
        </p>
      </div>
    </section>
  );
}
