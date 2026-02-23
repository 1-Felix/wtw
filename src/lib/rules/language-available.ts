import type { Season, Movie } from "@/lib/models/media";
import type { RuleResult } from "@/lib/models/readiness";
import type { RuleContext } from "./types";

export const RULE_NAME = "language-available";

/**
 * Map of common language names to ISO 639-2 codes.
 * Used to normalize language targets for matching.
 */
const LANGUAGE_ALIASES: Record<string, string[]> = {
  eng: ["english", "en"],
  jpn: ["japanese", "ja", "jp"],
  kor: ["korean", "ko", "kr"],
  deu: ["german", "de", "ger"],
  fra: ["french", "fr", "fre"],
  spa: ["spanish", "es"],
  ita: ["italian", "it"],
  por: ["portuguese", "pt"],
  rus: ["russian", "ru"],
  zho: ["chinese", "zh", "chi", "cmn", "mandarin"],
  ara: ["arabic", "ar"],
  hin: ["hindi", "hi"],
  tha: ["thai", "th"],
  vie: ["vietnamese", "vi"],
  pol: ["polish", "pl"],
  nld: ["dutch", "nl", "dut"],
  swe: ["swedish", "sv"],
  nor: ["norwegian", "no", "nob", "nno"],
  dan: ["danish", "da"],
  fin: ["finnish", "fi"],
  tur: ["turkish", "tr"],
  ind: ["indonesian", "id"],
  ukr: ["ukrainian", "uk"],
  ces: ["czech", "cs", "cze"],
  hun: ["hungarian", "hu"],
  ron: ["romanian", "ro", "rum"],
  ell: ["greek", "el", "gre"],
  heb: ["hebrew", "he"],
  lat: ["latin", "la"],
  und: ["undetermined", "unknown"],
};

/**
 * Normalize a language string to its ISO 639-2 code.
 * Accepts full names ("English"), ISO codes ("eng", "en"), etc.
 */
export function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase().trim();

  // Already an ISO 639-2 code?
  if (LANGUAGE_ALIASES[lower]) {
    return lower;
  }

  // Check aliases
  for (const [code, aliases] of Object.entries(LANGUAGE_ALIASES)) {
    if (aliases.includes(lower)) {
      return code;
    }
  }

  // Unknown language - return as-is for direct matching
  return lower;
}

/**
 * Check if a stream language matches the target language.
 */
function languageMatches(streamLang: string, targetLang: string): boolean {
  const normalizedStream = normalizeLanguage(streamLang);
  const normalizedTarget = normalizeLanguage(targetLang);
  return normalizedStream === normalizedTarget;
}

export function languageAvailableSeasonRule(
  season: Season,
  context: RuleContext
): RuleResult {
  const targetLang = context.config.languageTarget;

  let withLang = 0;
  let total = 0;

  for (const episode of season.episodes) {
    if (!episode.hasFile) continue;
    total++;

    // If no audio stream data, treat optimistically
    if (episode.audioStreams.length === 0) {
      withLang++;
      continue;
    }

    const hasTarget = episode.audioStreams.some((s) =>
      languageMatches(s.language, targetLang)
    );
    if (hasTarget) withLang++;
  }

  if (total === 0) {
    return {
      ruleName: RULE_NAME,
      passed: true,
      detail: "No episodes to check",
      compactDetail: "",
      numerator: 0,
      denominator: 0,
    };
  }

  const normalizedTarget = normalizeLanguage(targetLang);
  const passed = withLang >= total;

  return {
    ruleName: RULE_NAME,
    passed,
    detail: passed
      ? `All ${total} episodes have ${targetLang} audio`
      : `${withLang}/${total} episodes have ${targetLang} audio`,
    compactDetail: passed
      ? `${normalizedTarget} audio`
      : `${withLang}/${total} ${normalizedTarget} audio`,
    numerator: withLang,
    denominator: total,
  };
}

export function languageAvailableMovieRule(
  movie: Movie,
  context: RuleContext
): RuleResult {
  const targetLang = context.config.languageTarget;

  const normalizedTarget = normalizeLanguage(targetLang);

  // If no audio stream data, treat optimistically
  if (movie.audioStreams.length === 0) {
    return {
      ruleName: RULE_NAME,
      passed: true,
      detail: "No audio stream data available",
      compactDetail: `${normalizedTarget} audio`,
      numerator: 1,
      denominator: 1,
    };
  }

  const hasTarget = movie.audioStreams.some((s) =>
    languageMatches(s.language, targetLang)
  );

  return {
    ruleName: RULE_NAME,
    passed: hasTarget,
    detail: hasTarget
      ? `${targetLang} audio available`
      : `${targetLang} audio not available`,
    compactDetail: hasTarget
      ? `${normalizedTarget} audio`
      : `${normalizedTarget} audio not available`,
    numerator: hasTarget ? 1 : 0,
    denominator: 1,
  };
}
