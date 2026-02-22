import { z } from "zod/v4";

// --- Zod schemas for runtime validation ---

export const rulesConfigSchema = z.object({
  rules: z.object({
    completeSeason: z.boolean(),
    languageAvailable: z.boolean(),
    fullyMonitored: z.boolean(),
  }),
  languageTarget: z.string(),
  almostReadyThreshold: z.number(),
  compositionMode: z.enum(["and", "or"]),
  overrides: z.record(
    z.string(),
    z.object({
      disabledRules: z.array(z.string()).optional(),
      languageTarget: z.string().optional(),
    })
  ),
  hideWatched: z.boolean(),
});

export const webhookSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
  type: z.enum(["discord", "generic"]),
  enabled: z.boolean(),
  filters: z.object({ onReady: z.boolean(), onAlmostReady: z.boolean() }),
});

export const dismissedItemSchema = z.object({
  media_id: z.string(),
  media_title: z.string(),
  dismissed_at: z.string(),
});

export const healthResponseSchema = z.object({
  status: z.string(),
  phase: z.string(),
  lastSyncStart: z.string().nullable(),
  lastSyncEnd: z.string().nullable(),
  syncIntervalMinutes: z.number().optional(),
  rulesJsonImported: z.boolean().optional(),
  services: z.array(
    z.object({
      name: z.string(),
      connected: z.boolean(),
      lastSuccess: z.string().nullable(),
      lastError: z.string().nullable(),
      lastErrorMessage: z.string().nullable(),
    })
  ),
  rulesConfigError: z.string().nullable(),
});

// --- Types (inferred from schemas) ---

export type RulesConfig = z.infer<typeof rulesConfigSchema>;
export type Webhook = z.infer<typeof webhookSchema>;
export type DismissedItem = z.infer<typeof dismissedItemSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export type SettingsSection =
  | "rules"
  | "language"
  | "overrides"
  | "notifications"
  | "dismissed"
  | "about";
