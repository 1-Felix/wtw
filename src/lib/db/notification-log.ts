import { getDb } from "./index";

/**
 * Check if a notification has already been sent for a specific media+event+webhook combination.
 */
export function hasNotificationBeenSent(
  mediaId: string,
  eventType: "ready" | "almost-ready",
  webhookId: number
): boolean {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT 1 FROM notification_log WHERE media_id = ? AND event_type = ? AND webhook_id = ?"
    )
    .get(mediaId, eventType, webhookId);
  return row !== undefined;
}

/**
 * Record that a notification was sent.
 */
export function logNotificationSent(
  mediaId: string,
  mediaTitle: string,
  eventType: "ready" | "almost-ready",
  webhookId: number
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO notification_log (media_id, media_title, event_type, webhook_id) VALUES (?, ?, ?, ?)"
  ).run(mediaId, mediaTitle, eventType, webhookId);
}
