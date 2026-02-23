"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  rulesConfigSchema,
  webhookSchema,
  dismissedItemSchema,
} from "../schemas";
import type { RulesConfig, Webhook, DismissedItem } from "../schemas";

const AUTO_SAVE_DELAY = 800;

export function useSettings() {
  const router = useRouter();
  const [config, setConfig] = useState<RulesConfig | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [dismissed, setDismissed] = useState<DismissedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Track the last saved/loaded config JSON to skip saves when nothing changed
  const lastSavedConfig = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestConfig = useRef<RulesConfig | null>(null);
  // Keep router in a ref so doSave is stable and doesn't re-trigger effects
  const routerRef = useRef(router);
  routerRef.current = router;

  // Keep latest config in ref for flush-on-unmount
  latestConfig.current = config;

  // Stable save function that updates the ref and triggers RSC refresh
  const doSave = useCallback(
    async (configToSave: RulesConfig) => {
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(configToSave),
        });
        if (res.ok) {
          // Update ref so the comparison guard doesn't re-trigger
          lastSavedConfig.current = JSON.stringify(configToSave);
          toast.success("Settings saved");
          // Re-render server components (nav badge counts, page content)
          routerRef.current.refresh();
        } else {
          toast.error("Failed to save settings");
        }
      } catch {
        toast.error("Failed to save settings");
      }
    },
    [],
  );

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
          // Store the loaded config so auto-save can detect actual changes
          lastSavedConfig.current = JSON.stringify(parsedConfig.data);
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
      })
      .catch(() => {
        toast.error("Couldn't load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  // Auto-save: debounce config changes, only save when config actually differs
  useEffect(() => {
    if (!config) return;

    // Skip save if config matches what we last loaded/saved
    const configJson = JSON.stringify(config);
    if (configJson === lastSavedConfig.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      doSave(config);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, doSave]);

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
