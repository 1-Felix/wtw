import type { TransitionEvent } from "./transition-detector";

/**
 * Format a transition event into a generic JSON webhook payload.
 */
export function formatGenericPayload(event: TransitionEvent): Record<string, unknown> {
  const media: Record<string, unknown> = {
    id: event.mediaId,
    title: event.mediaTitle,
    type: event.mediaType,
  };

  if (event.mediaType === "season" && event.seasonNumber !== undefined) {
    media.seasonNumber = event.seasonNumber;
  }

  if (event.episodeCurrent !== undefined && event.episodeTotal !== undefined) {
    media.progress = {
      current: event.episodeCurrent,
      total: event.episodeTotal,
    };
  }

  const verdict: Record<string, unknown> = {
    status: event.eventType,
    previousStatus: event.previousStatus,
  };

  if (event.ruleResults && event.ruleResults.length > 0) {
    verdict.ruleResults = event.ruleResults.map((r) => ({
      ruleName: r.ruleName,
      passed: r.passed,
      detail: r.detail,
      numerator: r.numerator,
      denominator: r.denominator,
    }));
  }

  return {
    event: `media.${event.eventType}`,
    media,
    verdict,
    timestamp: new Date().toISOString(),
  };
}
