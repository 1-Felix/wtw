import { getDb } from "./index";

/**
 * Get a single setting value from the database.
 * Returns the parsed JSON value, or undefined if the key doesn't exist.
 */
export function getSetting<T>(key: string): T | undefined {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!row) return undefined;
  return JSON.parse((row as { value: string }).value) as T;
}

/**
 * Set a single setting value in the database.
 * The value is JSON-serialized before storage.
 */
export function setSetting(key: string, value: unknown): void {
  const db = getDb();
  const jsonValue = JSON.stringify(value);
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, jsonValue);
}

/**
 * Get all settings as a key-value map.
 * Values are parsed from JSON.
 */
export function getAllSettings(): Record<string, unknown> {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    const { key, value } = row as { key: string; value: string };
    settings[key] = JSON.parse(value);
  }
  return settings;
}

/**
 * Set multiple settings at once (transactional).
 */
export function setAllSettings(settings: Record<string, unknown>): void {
  const db = getDb();
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  const runBatch = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, JSON.stringify(value));
    }
  });
  runBatch();
}

/**
 * Check if any settings exist in the database.
 */
export function hasSettings(): boolean {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM settings").get();
  return (row as { count: number }).count > 0;
}
