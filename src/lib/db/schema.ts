/**
 * SQL statements for creating the wtw database tables.
 * Used by the initial migration (v001).
 */

export const CREATE_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
)`;

export const CREATE_WEBHOOKS_TABLE = `
CREATE TABLE IF NOT EXISTS webhooks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  type       TEXT NOT NULL CHECK(type IN ('discord', 'generic')),
  enabled    INTEGER NOT NULL DEFAULT 1,
  filters    TEXT NOT NULL DEFAULT '{"onReady":true,"onAlmostReady":false}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const CREATE_NOTIFICATION_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS notification_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id    TEXT NOT NULL,
  media_title TEXT NOT NULL,
  event_type  TEXT NOT NULL CHECK(event_type IN ('ready', 'almost-ready')),
  webhook_id  INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  sent_at     TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const CREATE_DISMISSED_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS dismissed_items (
  media_id     TEXT PRIMARY KEY,
  media_title  TEXT NOT NULL,
  dismissed_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

/** Index for efficient duplicate notification checks */
export const CREATE_NOTIFICATION_LOG_INDEX = `
CREATE INDEX IF NOT EXISTS idx_notification_log_dedup
ON notification_log (media_id, event_type, webhook_id)`;
