import type { TransitionEvent } from "./transition-detector";

const AMBER_COLOR = 0xf59e0b;
const ORANGE_COLOR = 0xd97706;

/**
 * Build a Jellyfin poster image URL if posterImageId is available.
 */
function buildThumbnailUrl(posterImageId: string | null | undefined): string | undefined {
  if (!posterImageId) return undefined;
  try {
    const jellyfinUrl = process.env.JELLYFIN_URL;
    if (!jellyfinUrl) return undefined;
    return `${jellyfinUrl.replace(/\/$/, "")}/Items/${posterImageId}/Images/Primary?maxWidth=256`;
  } catch {
    return undefined;
  }
}

/**
 * Format a transition event into a Discord webhook embed payload.
 */
export function formatDiscordEmbed(event: TransitionEvent): Record<string, unknown> {
  const isReady = event.eventType === "ready";
  const title = isReady ? "Ready to Watch" : "Almost Ready";
  const color = isReady ? AMBER_COLOR : ORANGE_COLOR;

  let description: string;
  if (event.mediaType === "season") {
    description = `**${event.mediaTitle}** — Season ${event.seasonNumber ?? "?"}`;
    if (event.episodeCurrent !== undefined && event.episodeTotal !== undefined) {
      description += `\n${event.episodeCurrent}/${event.episodeTotal} episodes available`;
    }
  } else {
    description = `**${event.mediaTitle}**`;
  }

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];

  if (event.episodeCurrent !== undefined && event.episodeTotal !== undefined) {
    fields.push({
      name: "Episodes",
      value: `${event.episodeCurrent}/${event.episodeTotal}`,
      inline: true,
    });
  }

  if (event.ruleResults && event.ruleResults.length > 0) {
    const rulesSummary = event.ruleResults
      .map((r) => `${r.passed ? "\u2705" : "\u274c"} ${r.ruleName}: ${r.detail}`)
      .join("\n");
    fields.push({
      name: "Rules",
      value: rulesSummary,
      inline: false,
    });
  }

  const thumbnailUrl = buildThumbnailUrl(event.posterImageId);

  return {
    embeds: [
      {
        title,
        description,
        color,
        fields: fields.length > 0 ? fields : undefined,
        thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
        footer: { text: "wtw" },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
