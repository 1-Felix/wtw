import type { TransitionEvent } from "./transition-detector";
import { formatDiscordEmbed } from "./discord-formatter";
import { formatGenericPayload } from "./generic-formatter";
import { getEnabledWebhooks } from "@/lib/db/webhooks";
import {
  hasNotificationBeenSent,
  logNotificationSent,
} from "@/lib/db/notification-log";

/**
 * Dispatch notifications for all transition events to all matching webhooks.
 * Checks the notification log to prevent duplicates.
 * Logs errors but does NOT throw — notification failures should never break the sync cycle.
 */
export async function dispatchNotifications(
  events: TransitionEvent[]
): Promise<void> {
  if (events.length === 0) return;

  const webhooks = getEnabledWebhooks();
  if (webhooks.length === 0) return;

  for (const event of events) {
    for (const webhook of webhooks) {
      // Check if webhook filters match this event type
      if (event.eventType === "ready" && !webhook.filters.onReady) continue;
      if (event.eventType === "almost-ready" && !webhook.filters.onAlmostReady)
        continue;

      // Check for duplicate
      if (hasNotificationBeenSent(event.mediaId, event.eventType, webhook.id)) {
        continue;
      }

      // Format payload based on webhook type
      const payload =
        webhook.type === "discord"
          ? formatDiscordEmbed(event)
          : formatGenericPayload(event);

      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          // Log successful send to prevent duplicates
          logNotificationSent(
            event.mediaId,
            event.mediaTitle,
            event.eventType,
            webhook.id
          );
          console.log(
            `Notification sent: ${event.eventType} for "${event.mediaTitle}" to webhook "${webhook.name}"`
          );
        } else {
          // Do NOT log as sent — will retry on next detection
          console.error(
            `Webhook "${webhook.name}" returned ${response.status} for "${event.mediaTitle}"`
          );
        }
      } catch (err) {
        // Do NOT log as sent — will retry on next detection
        console.error(
          `Failed to send notification to webhook "${webhook.name}":`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }
}
