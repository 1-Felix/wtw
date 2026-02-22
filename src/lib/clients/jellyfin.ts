import { z } from "zod/v4";
import { getEnvConfig } from "@/lib/config/env";

// --- Zod schemas for Jellyfin API responses ---

const jellyfinLibrarySchema = z.object({
  Id: z.string(),
  Name: z.string(),
  CollectionType: z.string().optional(),
});

const jellyfinMediaStreamSchema = z.object({
  Type: z.string(),
  Language: z.string().optional().nullable(),
  DisplayTitle: z.string().optional().nullable(),
  Codec: z.string().optional().nullable(),
  IsDefault: z.boolean().optional(),
  IsExternal: z.boolean().optional(),
});

const jellyfinUserDataSchema = z.object({
  PlayedPercentage: z.number().optional().nullable(),
  Played: z.boolean().optional(),
  LastPlayedDate: z.string().optional().nullable(),
});

const jellyfinItemSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Type: z.string(),
  SeriesName: z.string().optional().nullable(),
  SeriesId: z.string().optional().nullable(),
  ParentIndexNumber: z.number().optional().nullable(),
  IndexNumber: z.number().optional().nullable(),
  ProductionYear: z.number().optional().nullable(),
  PremiereDate: z.string().optional().nullable(),
  DateCreated: z.string().optional().nullable(),
  MediaStreams: z.array(jellyfinMediaStreamSchema).optional().nullable(),
  UserData: jellyfinUserDataSchema.optional().nullable(),
  ProviderIds: z.record(z.string(), z.string().nullable()).optional().nullable(),
  ImageTags: z.record(z.string(), z.string()).optional().nullable(),
  ChildCount: z.number().optional().nullable(),
});
type JellyfinItem = z.infer<typeof jellyfinItemSchema>;

const jellyfinItemsResponseSchema = z.object({
  Items: z.array(jellyfinItemSchema),
  TotalRecordCount: z.number(),
});

const jellyfinPlaybackInfoSchema = z.object({
  Items: z.array(jellyfinItemSchema),
  TotalRecordCount: z.number(),
});

// --- Client ---

export class JellyfinClient {
  private baseUrl: string;
  private apiKey: string;
  private userId: string;
  private timeout: number;

  constructor(baseUrl?: string, apiKey?: string, userId?: string, timeout = 30000) {
    const config = getEnvConfig();
    this.baseUrl = (baseUrl ?? config.JELLYFIN_URL).replace(/\/$/, "");
    this.apiKey = apiKey ?? config.JELLYFIN_API_KEY;
    this.userId = userId ?? config.JELLYFIN_USER_ID;
    this.timeout = timeout;
  }

  private async fetch<T>(
    path: string,
    schema: z.ZodType<T>,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    url.searchParams.set("api_key", this.apiKey);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(this.timeout),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `Jellyfin API error: ${response.status} ${response.statusText} for ${path}`
      );
    }

    const json: unknown = await response.json();
    return schema.parse(json);
  }

  /** Fetch all media libraries */
  async getLibraries() {
    const data = await this.fetch(
      "/Library/VirtualFolders",
      z.array(
        z.object({
          Name: z.string(),
          ItemId: z.string(),
          CollectionType: z.string().optional(),
        })
      )
    );
    return data;
  }

  /** Fetch all series in a library */
  async getSeries(libraryId: string) {
    const data = await this.fetch(
      "/Items",
      jellyfinItemsResponseSchema,
      {
        ParentId: libraryId,
        IncludeItemTypes: "Series",
        Recursive: "true",
        Fields:
          "ProviderIds,DateCreated,ImageTags,ChildCount",
        Limit: "10000",
      }
    );
    return data.Items;
  }

  /** Fetch all seasons for a series */
  async getSeasons(seriesId: string) {
    const data = await this.fetch(
      `/Shows/${seriesId}/Seasons`,
      jellyfinItemsResponseSchema,
      {
        Fields: "ProviderIds,ChildCount,ImageTags",
      }
    );
    return data.Items;
  }

  /** Fetch all episodes for a season */
  async getEpisodes(seriesId: string, seasonId: string) {
    const data = await this.fetch(
      `/Shows/${seriesId}/Episodes`,
      jellyfinItemsResponseSchema,
      {
        SeasonId: seasonId,
        UserId: this.userId,
        Fields:
          "MediaStreams,ProviderIds,UserData,DateCreated,PremiereDate",
      }
    );
    return data.Items;
  }

  /** Fetch audio/subtitle streams for a single episode */
  async getEpisodeStreams(episodeId: string) {
    const data = await this.fetch(
      `/Items/${episodeId}`,
      jellyfinItemSchema,
      {
        Fields: "MediaStreams",
      }
    );
    return {
      audioStreams: (data.MediaStreams ?? [])
        .filter((s) => s.Type === "Audio")
        .map((s) => ({
          language: s.Language ?? "Unknown",
          displayTitle: s.DisplayTitle ?? undefined,
          codec: s.Codec ?? undefined,
          isDefault: s.IsDefault ?? false,
        })),
      subtitleStreams: (data.MediaStreams ?? [])
        .filter((s) => s.Type === "Subtitle")
        .map((s) => ({
          language: s.Language ?? "Unknown",
          displayTitle: s.DisplayTitle ?? undefined,
          codec: s.Codec ?? undefined,
          isExternal: s.IsExternal ?? false,
          isDefault: s.IsDefault ?? false,
        })),
    };
  }

  /** Fetch all movies in a library */
  async getMovies(libraryId: string) {
    const data = await this.fetch(
      "/Items",
      jellyfinItemsResponseSchema,
      {
        ParentId: libraryId,
        IncludeItemTypes: "Movie",
        Recursive: "true",
        UserId: this.userId,
        Fields:
          "MediaStreams,ProviderIds,UserData,DateCreated,ImageTags",
        Limit: "10000",
      }
    );
    return data.Items;
  }

  /** Fetch in-progress / partially watched items */
  async getPlaybackProgress() {
    const data = await this.fetch(
      "/Items/Resume",
      jellyfinItemsResponseSchema,
      {
        IncludeItemTypes: "Episode,Movie",
        UserId: this.userId,
        Fields:
          "MediaStreams,ProviderIds,UserData,DateCreated,ImageTags",
        Limit: "100",
      }
    );
    return data.Items;
  }

  /** Construct a proxied poster image URL */
  getImageUrl(itemId: string): string {
    return `/api/images/${itemId}`;
  }

  /** Get the raw Jellyfin image URL (for server-side proxying) */
  getRawImageUrl(itemId: string): string {
    return `${this.baseUrl}/Items/${itemId}/Images/Primary?api_key=${this.apiKey}&maxWidth=400`;
  }
}

// --- Helper to extract normalized data from Jellyfin items ---

export function extractStreams(item: JellyfinItem) {
  const streams = item.MediaStreams ?? [];
  return {
    audioStreams: streams
      .filter((s) => s.Type === "Audio")
      .map((s) => ({
        language: s.Language ?? "Unknown",
        displayTitle: s.DisplayTitle ?? undefined,
        codec: s.Codec ?? undefined,
        isDefault: s.IsDefault ?? false,
      })),
    subtitleStreams: streams
      .filter((s) => s.Type === "Subtitle")
      .map((s) => ({
        language: s.Language ?? "Unknown",
        displayTitle: s.DisplayTitle ?? undefined,
        codec: s.Codec ?? undefined,
        isExternal: s.IsExternal ?? false,
        isDefault: s.IsDefault ?? false,
      })),
  };
}

export function extractWatchStatus(item: JellyfinItem) {
  const userData = item.UserData;
  return {
    isWatched: userData?.Played ?? false,
    playbackProgress: userData?.PlayedPercentage
      ? userData.PlayedPercentage / 100
      : null,
    lastPlayed: userData?.LastPlayedDate ?? null,
  };
}

export function extractProviderIds(item: JellyfinItem) {
  const ids = item.ProviderIds ?? {};
  return {
    tvdbId: ids.Tvdb ?? null,
    imdbId: ids.Imdb ?? null,
    tmdbId: ids.Tmdb ?? null,
  };
}
