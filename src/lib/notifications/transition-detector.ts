import type { ReadinessStatus, RuleResult } from "@/lib/models/readiness";

export interface VerdictEntry {
  mediaId: string;
  mediaTitle: string;
  mediaType: "season" | "movie";
  seasonNumber?: number;
  status: ReadinessStatus;
  episodeCurrent?: number;
  episodeTotal?: number;
  posterImageId?: string | null;
  ruleResults?: RuleResult[];
}

export type VerdictMap = Map<string, VerdictEntry>;

export interface TransitionEvent {
  mediaId: string;
  mediaTitle: string;
  mediaType: "season" | "movie";
  seasonNumber?: number;
  eventType: "ready" | "almost-ready";
  previousStatus: ReadinessStatus;
  episodeCurrent?: number;
  episodeTotal?: number;
  posterImageId?: string | null;
  ruleResults?: RuleResult[];
}

/**
 * Compare previous and current verdict maps to detect readiness transitions.
 * Only positive transitions are reported (→ ready, → almost-ready).
 *
 * Returns null if previousVerdicts is null (first sync — skip notification).
 */
export function detectTransitions(
  previousVerdicts: VerdictMap | null,
  currentVerdicts: VerdictMap
): TransitionEvent[] {
  // First sync: no previous data to compare against
  if (previousVerdicts === null) {
    return [];
  }

  const events: TransitionEvent[] = [];

  for (const [key, current] of currentVerdicts) {
    const previous = previousVerdicts.get(key);
    const previousStatus: ReadinessStatus = previous?.status ?? "not-ready";

    // Only detect positive transitions
    if (current.status === "ready" && previousStatus !== "ready") {
      events.push({
        mediaId: current.mediaId,
        mediaTitle: current.mediaTitle,
        mediaType: current.mediaType,
        seasonNumber: current.seasonNumber,
        eventType: "ready",
        previousStatus,
        episodeCurrent: current.episodeCurrent,
        episodeTotal: current.episodeTotal,
        posterImageId: current.posterImageId,
        ruleResults: current.ruleResults,
      });
    } else if (
      current.status === "almost-ready" &&
      previousStatus === "not-ready"
    ) {
      events.push({
        mediaId: current.mediaId,
        mediaTitle: current.mediaTitle,
        mediaType: current.mediaType,
        seasonNumber: current.seasonNumber,
        eventType: "almost-ready",
        previousStatus,
        episodeCurrent: current.episodeCurrent,
        episodeTotal: current.episodeTotal,
        posterImageId: current.posterImageId,
        ruleResults: current.ruleResults,
      });
    }
  }

  return events;
}
