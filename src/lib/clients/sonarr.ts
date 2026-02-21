import { z } from "zod/v4";
import { getEnvConfig } from "@/lib/config/env";

// --- Zod schemas for Sonarr API v3 responses ---

const sonarrSeasonSchema = z.object({
  seasonNumber: z.number(),
  monitored: z.boolean(),
  statistics: z
    .object({
      episodeFileCount: z.number().optional(),
      episodeCount: z.number().optional(),
      totalEpisodeCount: z.number().optional(),
      percentOfEpisodes: z.number().optional(),
    })
    .optional(),
});

const sonarrSeriesSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().optional(),
  tvdbId: z.number().optional().nullable(),
  imdbId: z.string().optional().nullable(),
  monitored: z.boolean(),
  seasons: z.array(sonarrSeasonSchema),
  languageProfileId: z.number().optional().nullable(),
  added: z.string().optional(),
  images: z
    .array(
      z.object({
        coverType: z.string(),
        remoteUrl: z.string().optional().nullable(),
      })
    )
    .optional(),
});
export type SonarrSeries = z.infer<typeof sonarrSeriesSchema>;

const sonarrEpisodeSchema = z.object({
  id: z.number(),
  seriesId: z.number(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  title: z.string().optional().nullable(),
  hasFile: z.boolean(),
  monitored: z.boolean(),
  airDateUtc: z.string().optional().nullable(),
});
export type SonarrEpisode = z.infer<typeof sonarrEpisodeSchema>;

const sonarrLanguageProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  languages: z.array(
    z.object({
      language: z.object({
        id: z.number(),
        name: z.string(),
      }),
      allowed: z.boolean(),
    })
  ),
});
export type SonarrLanguageProfile = z.infer<typeof sonarrLanguageProfileSchema>;

// --- Client ---

export class SonarrClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(baseUrl?: string, apiKey?: string, timeout = 30000) {
    const config = getEnvConfig();
    this.baseUrl = (baseUrl ?? config.SONARR_URL ?? "").replace(/\/$/, "");
    this.apiKey = apiKey ?? config.SONARR_API_KEY ?? "";
    this.timeout = timeout;
  }

  private async fetch<T>(
    path: string,
    schema: z.ZodType<T>,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`/api/v3${path}`, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(this.timeout),
      headers: {
        Accept: "application/json",
        "X-Api-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Sonarr API error: ${response.status} ${response.statusText} for ${path}`
      );
    }

    const json: unknown = await response.json();
    return schema.parse(json);
  }

  /** Fetch all series */
  async getAllSeries(): Promise<SonarrSeries[]> {
    return this.fetch("/series", z.array(sonarrSeriesSchema));
  }

  /** Fetch all episodes for a series */
  async getEpisodes(seriesId: number): Promise<SonarrEpisode[]> {
    return this.fetch("/episode", z.array(sonarrEpisodeSchema), {
      seriesId: String(seriesId),
    });
  }

  /** Fetch language profiles */
  async getLanguageProfiles(): Promise<SonarrLanguageProfile[]> {
    return this.fetch(
      "/languageprofile",
      z.array(sonarrLanguageProfileSchema)
    );
  }
}
