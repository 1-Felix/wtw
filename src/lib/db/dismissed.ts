import { getDb } from "./index";

export interface DismissedItem {
  media_id: string;
  media_title: string;
  dismissed_at: string;
}

/**
 * Dismiss a media item.
 */
export function dismissItem(mediaId: string, mediaTitle: string): void {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO dismissed_items (media_id, media_title) VALUES (?, ?)"
  ).run(mediaId, mediaTitle);
}

/**
 * Un-dismiss a media item.
 */
export function undismissItem(mediaId: string): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM dismissed_items WHERE media_id = ?")
    .run(mediaId);
  return result.changes > 0;
}

/**
 * Check if a media item is dismissed.
 */
export function isDismissed(mediaId: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM dismissed_items WHERE media_id = ?")
    .get(mediaId);
  return row !== undefined;
}

/**
 * Get all dismissed items.
 */
export function getAllDismissed(): DismissedItem[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM dismissed_items ORDER BY dismissed_at DESC")
    .all() as DismissedItem[];
}

/**
 * Get a set of all dismissed media IDs (for efficient filtering).
 */
export function getDismissedIds(): Set<string> {
  const db = getDb();
  const rows = db.prepare("SELECT media_id FROM dismissed_items").all();
  return new Set((rows as Array<{ media_id: string }>).map((r) => r.media_id));
}
