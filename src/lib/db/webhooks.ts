import { getDb } from "./index";

export interface WebhookRow {
  id: number;
  name: string;
  url: string;
  type: "discord" | "generic";
  enabled: boolean;
  filters: { onReady: boolean; onAlmostReady: boolean };
  created_at: string;
  updated_at: string;
}

interface RawWebhookRow {
  id: number;
  name: string;
  url: string;
  type: string;
  enabled: number;
  filters: string;
  created_at: string;
  updated_at: string;
}

function parseRow(raw: RawWebhookRow): WebhookRow {
  return {
    id: raw.id,
    name: raw.name,
    url: raw.url,
    type: raw.type as "discord" | "generic",
    enabled: raw.enabled === 1,
    filters: JSON.parse(raw.filters) as { onReady: boolean; onAlmostReady: boolean },
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

export function getAllWebhooks(): WebhookRow[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM webhooks ORDER BY created_at DESC").all();
  return (rows as RawWebhookRow[]).map(parseRow);
}

export function getWebhookById(id: number): WebhookRow | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
  if (!row) return undefined;
  return parseRow(row as RawWebhookRow);
}

export function createWebhook(data: {
  name: string;
  url: string;
  type: "discord" | "generic";
  enabled?: boolean;
  filters?: { onReady: boolean; onAlmostReady: boolean };
}): WebhookRow {
  const db = getDb();
  const filters = JSON.stringify(data.filters ?? { onReady: true, onAlmostReady: false });
  const enabled = data.enabled !== false ? 1 : 0;

  const result = db
    .prepare(
      "INSERT INTO webhooks (name, url, type, enabled, filters) VALUES (?, ?, ?, ?, ?)"
    )
    .run(data.name, data.url, data.type, enabled, filters);

  return getWebhookById(Number(result.lastInsertRowid))!;
}

export function updateWebhook(
  id: number,
  data: Partial<{
    name: string;
    url: string;
    type: "discord" | "generic";
    enabled: boolean;
    filters: { onReady: boolean; onAlmostReady: boolean };
  }>
): WebhookRow | undefined {
  const db = getDb();
  const existing = getWebhookById(id);
  if (!existing) return undefined;

  const name = data.name ?? existing.name;
  const url = data.url ?? existing.url;
  const type = data.type ?? existing.type;
  const enabled = (data.enabled ?? existing.enabled) ? 1 : 0;
  const filters = JSON.stringify(data.filters ?? existing.filters);

  db.prepare(
    "UPDATE webhooks SET name = ?, url = ?, type = ?, enabled = ?, filters = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name, url, type, enabled, filters, id);

  return getWebhookById(id);
}

export function deleteWebhook(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM webhooks WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getEnabledWebhooks(): WebhookRow[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM webhooks WHERE enabled = 1").all();
  return (rows as RawWebhookRow[]).map(parseRow);
}
