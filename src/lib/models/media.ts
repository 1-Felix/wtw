import { z } from "zod/v4";

// --- Audio & Subtitle Streams ---

export const audioStreamSchema = z.object({
  language: z.string(),
  displayTitle: z.string().optional(),
  codec: z.string().optional(),
  isDefault: z.boolean().default(false),
});
export type AudioStream = z.infer<typeof audioStreamSchema>;

export const subtitleStreamSchema = z.object({
  language: z.string(),
  displayTitle: z.string().optional(),
  codec: z.string().optional(),
  isExternal: z.boolean().default(false),
  isDefault: z.boolean().default(false),
});
export type SubtitleStream = z.infer<typeof subtitleStreamSchema>;

// --- Episode ---

export const episodeSchema = z.object({
  /** Unique identifier (Jellyfin item ID) */
  id: z.string(),
  title: z.string(),
  seasonNumber: z.number().int(),
  episodeNumber: z.number().int(),

  /** Whether the episode file exists on disk */
  hasFile: z.boolean(),
  /** Whether the episode has aired */
  hasAired: z.boolean(),
  /** Whether the episode is monitored in Sonarr */
  isMonitored: z.boolean().nullable(),

  /** Jellyfin watched status */
  isWatched: z.boolean(),
  /** Playback progress (0-1), null if not started */
  playbackProgress: z.number().nullable(),
  /** Last played date */
  lastPlayed: z.string().nullable(),

  /** Available audio streams */
  audioStreams: z.array(audioStreamSchema),
  /** Available subtitle streams */
  subtitleStreams: z.array(subtitleStreamSchema),
});
export type Episode = z.infer<typeof episodeSchema>;

// --- Season ---

export const seasonSchema = z.object({
  seasonNumber: z.number().int(),
  title: z.string(),
  /** Total episodes announced/expected */
  totalEpisodes: z.number().int(),
  /** Episodes with files on disk */
  availableEpisodes: z.number().int(),
  /** Episodes that have aired */
  airedEpisodes: z.number().int(),
  episodes: z.array(episodeSchema),
});
export type Season = z.infer<typeof seasonSchema>;

// --- Series ---

export const seriesSchema = z.object({
  id: z.string(),
  title: z.string(),
  year: z.number().int().nullable(),
  posterImageId: z.string().nullable(),
  tvdbId: z.string().nullable(),
  imdbId: z.string().nullable(),
  dateAdded: z.string(),
  seasons: z.array(seasonSchema),

  /** Sonarr language profile name (e.g., "English", "Any") */
  languageProfile: z.string().nullable(),

  /** Source tracking */
  inJellyfin: z.boolean(),
  inSonarr: z.boolean(),
});
export type Series = z.infer<typeof seriesSchema>;

// --- Movie ---

export const movieSchema = z.object({
  id: z.string(),
  title: z.string(),
  year: z.number().int().nullable(),
  posterImageId: z.string().nullable(),
  tmdbId: z.string().nullable(),
  imdbId: z.string().nullable(),
  dateAdded: z.string(),

  hasFile: z.boolean(),
  isMonitored: z.boolean().nullable(),

  /** Jellyfin watched status */
  isWatched: z.boolean(),
  playbackProgress: z.number().nullable(),
  lastPlayed: z.string().nullable(),

  /** Available audio streams */
  audioStreams: z.array(audioStreamSchema),
  /** Available subtitle streams */
  subtitleStreams: z.array(subtitleStreamSchema),

  /** Source tracking */
  inJellyfin: z.boolean(),
  inRadarr: z.boolean(),
});
export type Movie = z.infer<typeof movieSchema>;
