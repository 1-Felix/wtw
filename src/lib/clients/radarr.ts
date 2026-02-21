import { z } from "zod/v4";
import { getEnvConfig } from "@/lib/config/env";

// --- Zod schemas for Radarr API v3 responses ---

const radarrMovieFileLanguageSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const radarrMovieFileSchema = z.object({
  id: z.number(),
  movieId: z.number(),
  languages: z.array(radarrMovieFileLanguageSchema).optional(),
  mediaInfo: z
    .object({
      audioLanguages: z.string().optional().nullable(),
      subtitles: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});
export type RadarrMovieFile = z.infer<typeof radarrMovieFileSchema>;

const radarrMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().optional(),
  tmdbId: z.number().optional().nullable(),
  imdbId: z.string().optional().nullable(),
  monitored: z.boolean(),
  hasFile: z.boolean(),
  added: z.string().optional(),
  movieFile: radarrMovieFileSchema.optional().nullable(),
  images: z
    .array(
      z.object({
        coverType: z.string(),
        remoteUrl: z.string().optional().nullable(),
      })
    )
    .optional(),
});
export type RadarrMovie = z.infer<typeof radarrMovieSchema>;

// --- Client ---

export class RadarrClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(baseUrl?: string, apiKey?: string, timeout = 30000) {
    const config = getEnvConfig();
    this.baseUrl = (baseUrl ?? config.RADARR_URL ?? "").replace(/\/$/, "");
    this.apiKey = apiKey ?? config.RADARR_API_KEY ?? "";
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
        `Radarr API error: ${response.status} ${response.statusText} for ${path}`
      );
    }

    const json: unknown = await response.json();
    return schema.parse(json);
  }

  /** Fetch all movies */
  async getAllMovies(): Promise<RadarrMovie[]> {
    return this.fetch("/movie", z.array(radarrMovieSchema));
  }

  /** Fetch movie file details (for language/audio info) */
  async getMovieFiles(movieId: number): Promise<RadarrMovieFile[]> {
    return this.fetch("/moviefile", z.array(radarrMovieFileSchema), {
      movieId: String(movieId),
    });
  }
}
