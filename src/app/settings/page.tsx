"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Settings as SettingsIcon,
  Save,
  Plus,
  Trash2,
  Undo2,
  Send,
  Loader2,
  Check,
  AlertCircle,
  Info,
} from "lucide-react";
import { z } from "zod/v4";

// --- Zod schemas for runtime validation ---

const rulesConfigSchema = z.object({
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
});

const webhookSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
  type: z.enum(["discord", "generic"]),
  enabled: z.boolean(),
  filters: z.object({ onReady: z.boolean(), onAlmostReady: z.boolean() }),
});

const dismissedItemSchema = z.object({
  media_id: z.string(),
  media_title: z.string(),
  dismissed_at: z.string(),
});

const healthResponseSchema = z.object({
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

type RulesConfig = z.infer<typeof rulesConfigSchema>;
type Webhook = z.infer<typeof webhookSchema>;
type DismissedItem = z.infer<typeof dismissedItemSchema>;
type HealthResponse = z.infer<typeof healthResponseSchema>;

type SettingsSection =
  | "rules"
  | "language"
  | "overrides"
  | "notifications"
  | "dismissed"
  | "about";

// --- Main component ---

export default function SettingsPage() {
  const [config, setConfig] = useState<RulesConfig | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [dismissed, setDismissed] = useState<DismissedItem[]>([]);
  const [activeSection, setActiveSection] = useState<SettingsSection>("rules");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [loading, setLoading] = useState(true);

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
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const json = await res.json();
        const parsed = rulesConfigSchema.safeParse(json);
        if (parsed.success) setConfig(parsed.data);
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [config]);

  if (loading || !config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const sections: { id: SettingsSection; label: string }[] = [
    { id: "rules", label: "Rules" },
    { id: "language", label: "Language" },
    { id: "overrides", label: "Overrides" },
    { id: "notifications", label: "Notifications" },
    { id: "dismissed", label: "Dismissed" },
    { id: "about", label: "About" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveStatus === "success" ? (
            <Check className="h-4 w-4" />
          ) : saveStatus === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving
            ? "Saving..."
            : saveStatus === "success"
              ? "Saved"
              : saveStatus === "error"
                ? "Error"
                : "Save"}
        </button>
      </div>

      {/* Section tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeSection === s.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-surface hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="space-y-6">
        {activeSection === "rules" && (
          <RulesSection config={config} onChange={setConfig} />
        )}
        {activeSection === "language" && (
          <LanguageSection config={config} onChange={setConfig} />
        )}
        {activeSection === "overrides" && (
          <OverridesSection config={config} onChange={setConfig} />
        )}
        {activeSection === "notifications" && (
          <NotificationsSection
            webhooks={webhooks}
            onWebhooksChange={setWebhooks}
          />
        )}
        {activeSection === "dismissed" && (
          <DismissedSection
            items={dismissed}
            onItemsChange={setDismissed}
          />
        )}
        {activeSection === "about" && <AboutSection />}
      </div>
    </div>
  );
}

// --- Rules Section ---

function RulesSection({
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
          <button
            onClick={() => toggleRule(rule.key)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              config.rules[rule.key] ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-foreground transition-transform ${
                config.rules[rule.key] ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      ))}
    </section>
  );
}

// --- Language Section ---

function LanguageSection({
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
        <input
          type="text"
          value={config.languageTarget}
          onChange={(e) =>
            onChange({ ...config, languageTarget: e.target.value })
          }
          className="h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm text-foreground"
          placeholder="English"
        />
      </div>

      {/* Composition Mode */}
      <div className="rounded-md border border-border bg-surface p-4">
        <label className="mb-2 block text-sm font-medium text-foreground">
          Composition Mode
        </label>
        <select
          value={config.compositionMode}
          onChange={(e) =>
            onChange({
              ...config,
              compositionMode: e.target.value as "and" | "or",
            })
          }
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="and">AND — All rules must pass</option>
          <option value="or">OR — Any rule can pass</option>
        </select>
      </div>

      {/* Threshold Slider */}
      <div className="rounded-md border border-border bg-surface p-4">
        <label className="mb-2 block text-sm font-medium text-foreground">
          Almost Ready Threshold:{" "}
          <span className="text-primary">
            {Math.round(config.almostReadyThreshold * 100)}%
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={Math.round(config.almostReadyThreshold * 100)}
          onChange={(e) =>
            onChange({
              ...config,
              almostReadyThreshold: parseInt(e.target.value) / 100,
            })
          }
          className="w-full max-w-xs accent-primary"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Items with progress above this threshold appear as &ldquo;Almost
          Ready&rdquo;
        </p>
      </div>
    </section>
  );
}

// --- Overrides Section ---

function OverridesSection({
  config,
  onChange,
}: {
  config: RulesConfig;
  onChange: (c: RulesConfig) => void;
}) {
  const [newKey, setNewKey] = useState("");
  const entries = Object.entries(config.overrides);

  const addOverride = () => {
    if (!newKey.trim()) return;
    onChange({
      ...config,
      overrides: {
        ...config.overrides,
        [newKey.trim()]: { disabledRules: [], languageTarget: undefined },
      },
    });
    setNewKey("");
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

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Per-Series Overrides
      </h3>

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No overrides configured.</p>
      )}

      {entries.map(([key, override]) => (
        <div
          key={key}
          className="rounded-md border border-border bg-surface p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{key}</span>
            <button
              onClick={() => removeOverride(key)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
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
            <input
              type="text"
              value={override.languageTarget ?? ""}
              onChange={(e) => setLanguage(key, e.target.value)}
              placeholder="Language override (empty = use global)"
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
            />
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Series title or TVDB ID"
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          onKeyDown={(e) => e.key === "Enter" && addOverride()}
        />
        <button
          onClick={addOverride}
          disabled={!newKey.trim()}
          className="flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm text-foreground transition-colors hover:bg-surface disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </section>
  );
}

// --- Notifications Section ---

function NotificationsSection({
  webhooks,
  onWebhooksChange,
}: {
  webhooks: Webhook[];
  onWebhooksChange: (w: Webhook[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formType, setFormType] = useState<"discord" | "generic">("discord");
  const [formOnReady, setFormOnReady] = useState(true);
  const [formOnAlmostReady, setFormOnAlmostReady] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, boolean>>({});

  const handleCreate = async () => {
    if (!formName.trim() || !formUrl.trim()) return;
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          url: formUrl,
          type: formType,
          filters: { onReady: formOnReady, onAlmostReady: formOnAlmostReady },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const parsed = webhookSchema.safeParse(json);
        if (parsed.success) onWebhooksChange([parsed.data, ...webhooks]);
        setShowForm(false);
        setFormName("");
        setFormUrl("");
        setFormOnReady(true);
        setFormOnAlmostReady(false);
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      onWebhooksChange(webhooks.filter((w) => w.id !== id));
    } catch {
      // ignore
    }
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        const json = await res.json();
        const parsed = webhookSchema.safeParse(json);
        if (parsed.success) {
          onWebhooksChange(
            webhooks.map((w) => (w.id === id ? parsed.data : w))
          );
        }
      }
    } catch {
      // ignore
    }
  };

  const handleFilterToggle = async (
    id: number,
    filterKey: "onReady" | "onAlmostReady",
    value: boolean
  ) => {
    const webhook = webhooks.find((w) => w.id === id);
    if (!webhook) return;
    const newFilters = { ...webhook.filters, [filterKey]: value };
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: newFilters }),
      });
      if (res.ok) {
        const json = await res.json();
        const parsed = webhookSchema.safeParse(json);
        if (parsed.success) {
          onWebhooksChange(
            webhooks.map((w) => (w.id === id ? parsed.data : w))
          );
        }
      }
    } catch {
      // ignore
    }
  };

  const handleTest = async (id: number) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
      const data = await res.json();
      const success = typeof data === "object" && data !== null && (data as Record<string, unknown>).success === true;
      setTestResult((prev) => ({ ...prev, [id]: success }));
      setTimeout(() => {
        setTestResult((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 3000);
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: false }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Webhooks
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-md border border-primary/30 bg-surface p-4">
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Webhook name"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
          <input
            type="url"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="Webhook URL"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
          <div className="flex items-center gap-4">
            <select
              value={formType}
              onChange={(e) =>
                setFormType(e.target.value as "discord" | "generic")
              }
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="discord">Discord</option>
              <option value="generic">Generic JSON</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={!formName.trim() || !formUrl.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Create
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Notify on:</span>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={formOnReady}
                onChange={(e) => setFormOnReady(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-foreground">Ready</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={formOnAlmostReady}
                onChange={(e) => setFormOnAlmostReady(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-foreground">Almost Ready</span>
            </label>
          </div>
        </div>
      )}

      {webhooks.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No webhooks configured.</p>
      )}

      {webhooks.map((webhook) => (
        <div
          key={webhook.id}
          className="flex items-center gap-3 rounded-md border border-border bg-surface p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {webhook.name}
              </span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {webhook.type}
              </span>
              {!webhook.enabled && (
                <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                  disabled
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {webhook.url}
            </p>
            <div className="mt-1 flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={webhook.filters.onReady}
                  onChange={(e) =>
                    handleFilterToggle(webhook.id, "onReady", e.target.checked)
                  }
                  className="accent-primary"
                />
                <span className="text-muted-foreground">Ready</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={webhook.filters.onAlmostReady}
                  onChange={(e) =>
                    handleFilterToggle(
                      webhook.id,
                      "onAlmostReady",
                      e.target.checked
                    )
                  }
                  className="accent-primary"
                />
                <span className="text-muted-foreground">Almost Ready</span>
              </label>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => handleTest(webhook.id)}
              disabled={testing === webhook.id}
              className={`rounded-md p-1.5 transition-colors ${
                testResult[webhook.id] === true
                  ? "text-primary"
                  : testResult[webhook.id] === false
                    ? "text-destructive"
                    : "text-muted-foreground hover:text-foreground"
              }`}
              title="Send test notification"
            >
              {testing === webhook.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => handleToggle(webhook.id, !webhook.enabled)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                webhook.enabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${
                  webhook.enabled ? "translate-x-4" : ""
                }`}
              />
            </button>
            <button
              onClick={() => handleDelete(webhook.id)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
              title="Delete webhook"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

// --- Dismissed Section ---

function DismissedSection({
  items,
  onItemsChange,
}: {
  items: DismissedItem[];
  onItemsChange: (items: DismissedItem[]) => void;
}) {
  const handleUndismiss = async (mediaId: string) => {
    try {
      await fetch(`/api/media/${mediaId}/dismiss`, { method: "DELETE" });
      onItemsChange(items.filter((i) => i.media_id !== mediaId));
    } catch {
      // ignore
    }
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Dismissed Items
      </h3>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No dismissed items.</p>
      )}

      {items.map((item) => (
        <div
          key={item.media_id}
          className="flex items-center justify-between rounded-md border border-border bg-surface p-3"
        >
          <div>
            <p className="text-sm text-foreground">{item.media_title}</p>
            <p className="text-xs text-muted-foreground">
              Dismissed{" "}
              {new Date(item.dismissed_at + "Z").toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => handleUndismiss(item.media_id)}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors hover:bg-surface-raised"
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </button>
        </div>
      ))}
    </section>
  );
}

// --- About Section ---

function AboutSection() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        const parsed = healthResponseSchema.safeParse(data);
        if (parsed.success) setHealth(parsed.data);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        About
      </h3>

      {/* Migration notice */}
      {health?.rulesJsonImported && (
        <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-foreground">
            Configuration was imported from rules.json. Changes are now saved to
            the database.
          </p>
        </div>
      )}

      <div className="space-y-2 rounded-md border border-border bg-surface p-4">
        <InfoRow label="Version" value="0.1.0" />
        <InfoRow
          label="Sync Phase"
          value={health ? health.phase : "Loading..."}
        />
        <InfoRow
          label="Sync Interval"
          value={
            health?.syncIntervalMinutes
              ? `${health.syncIntervalMinutes} minutes`
              : "..."
          }
        />
        <InfoRow
          label="Last Sync"
          value={
            health?.lastSyncEnd
              ? new Date(health.lastSyncEnd).toLocaleString()
              : "Never"
          }
        />
        <InfoRow label="Database" value="/config/wtw.db" />
      </div>

      {/* Services */}
      {health && health.services.length > 0 && (
        <div className="space-y-2 rounded-md border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Services
          </p>
          {health.services.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between text-sm">
              <span className="capitalize text-muted-foreground">{svc.name}</span>
              <span
                className={
                  svc.connected ? "text-primary" : "text-destructive"
                }
              >
                {svc.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
