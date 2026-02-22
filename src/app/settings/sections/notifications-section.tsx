"use client";

import { useState } from "react";
import { Plus, Trash2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { webhookSchema } from "../schemas";
import type { Webhook } from "../schemas";

export function NotificationsSection({
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
        toast.success(`${formName} webhook created`);
      } else {
        toast.error("Couldn't create webhook");
      }
    } catch {
      toast.error("Couldn't create webhook");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      onWebhooksChange(webhooks.filter((w) => w.id !== id));
      toast.success("Webhook deleted");
    } catch {
      toast.error("Couldn't delete webhook");
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
        toast.success(enabled ? "Webhook enabled" : "Webhook disabled");
      } else {
        toast.error("Couldn't update webhook");
      }
    } catch {
      toast.error("Couldn't update webhook");
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
      } else {
        toast.error("Couldn't update webhook filters");
      }
    } catch {
      toast.error("Couldn't update webhook filters");
    }
  };

  const handleTest = async (id: number) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
      const data = await res.json();
      const success = typeof data === "object" && data !== null && (data as Record<string, unknown>).success === true;
      if (success) {
        toast.success("Test notification sent");
      } else {
        toast.error("Webhook test failed — check the URL");
      }
    } catch {
      toast.error("Webhook test failed — check the URL");
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-md border border-primary/30 bg-surface p-4">
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Webhook name"
          />
          <Input
            type="url"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="Webhook URL"
          />
          <div className="flex items-center gap-4">
            <Select
              value={formType}
              onValueChange={(value) =>
                setFormType(value as "discord" | "generic")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="generic">Generic JSON</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleCreate}
              disabled={!formName.trim() || !formUrl.trim()}
            >
              Create
            </Button>
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
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleTest(webhook.id)}
              disabled={testing === webhook.id}
              className="text-muted-foreground hover:text-foreground"
              title="Send test notification"
            >
              {testing === webhook.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            <Switch
              size="sm"
              checked={webhook.enabled}
              onCheckedChange={(checked) => handleToggle(webhook.id, checked)}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleDelete(webhook.id)}
              className="text-muted-foreground hover:text-destructive"
              title="Delete webhook"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}
