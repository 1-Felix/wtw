"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  rulesConfigSchema,
  webhookSchema,
  dismissedItemSchema,
} from "../schemas";
import type { RulesConfig, Webhook, DismissedItem } from "../schemas";

const AUTO_SAVE_DELAY = 800;

export function useSettings() {
  const [config, setConfig] = useState<RulesConfig | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [dismissed, setDismissed] = useState<DismissedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Track whether the initial load has completed to skip auto-save on first render
  const initialLoadDone = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestConfig = useRef<RulesConfig | null>(null);

  // Keep latest config in ref for flush-on-unmount
  latestConfig.current = config;

  // Load all data
  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/webhooks").then((r) => r.json()),
      fetch("/api/dismissed").then((r) => r.json()),
    ])
      .then(([settingsData, webhooksData, dismissedData]) => {
        const parsedConfig = rulesConfigSchema.safeParse(settingsData);
        if (parsedConfig.success) {
          setConfig(parsedConfig.data);
        } else {
          console.error("Settings validation failed:", parsedConfig.error);
        }

        const webhooksList = (webhooksData as Record<string, unknown>).webhooks;
        if (Array.isArray(webhooksList)) {
          const parsed = webhooksList
            .map((w) => webhookSchema.safeParse(w))
            .filter((r) => r.success)
            .map((r) => r.data);
          setWebhooks(parsed);
        }

        const itemsList = (dismissedData as Record<string, unknown>).items;
        if (Array.isArray(itemsList)) {
          const parsed = itemsList
            .map((i) => dismissedItemSchema.safeParse(i))
            .filter((r) => r.success)
            .map((r) => r.data);
          setDismissed(parsed);
        }

        // Mark initial load as done after state is set
        // Use setTimeout to ensure the next render cycle sees initialLoadDone = true
        setTimeout(() => {
          initialLoadDone.current = true;
        }, 0);
      })
      .catch(() => {
        toast.error("Couldn't load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  // Auto-save: debounce config changes
  useEffect(() => {
    if (!initialLoadDone.current || !config) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      saveConfig(config);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Flush pending save on unmount — use keepalive to survive navigation
  useEffect(() => {
    return () => {
      if (debounceTimer.current && latestConfig.current) {
        clearTimeout(debounceTimer.current);
        flushConfig(latestConfig.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    config,
    setConfig,
    webhooks,
    setWebhooks,
    dismissed,
    setDismissed,
    loading,
  };
}

async function saveConfig(config: RulesConfig) {
  try {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      toast.success("Settings saved");
    } else {
      toast.error("Failed to save settings");
    }
  } catch {
    toast.error("Failed to save settings");
  }
}

/** Fire-and-forget save that survives page navigation via keepalive */
function flushConfig(config: RulesConfig) {
  fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
    keepalive: true,
  }).catch(() => {
    // Best-effort: if this fails during navigation, the user can re-save next visit
  });
}
