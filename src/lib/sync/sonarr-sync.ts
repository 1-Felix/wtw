import { SonarrClient } from "@/lib/clients/sonarr";

export interface SonarrSeriesData {
  sonarrId: number;
  title: string;
  tvdbId: string | null;
  imdbId: string | null;
  monitored: boolean;
  episodes: SonarrEpisodeData[];
  seasons: SonarrSeasonData[];
  /** Resolved language profile name (e.g., "English", "Any") */
  languageProfileName: string | null;
}

export interface SonarrSeasonData {
  seasonNumber: number;
  monitored: boolean;
  totalEpisodes: number;
  episodesWithFiles: number;
}

export interface SonarrEpisodeData {
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  hasFile: boolean;
  monitored: boolean;
  hasAired: boolean;
}

export async function syncSonarr(
  client: SonarrClient
): Promise<SonarrSeriesData[]> {
  // Fetch language profiles up front so we can resolve IDs to names
  const languageProfileMap = new Map<number, string>();
  try {
    const profiles = await client.getLanguageProfiles();
    for (const profile of profiles) {
      languageProfileMap.set(profile.id, profile.name);
    }
  } catch {
    // Language profiles may not be available (Sonarr v4 deprecated them).
    // This is non-fatal — we just won't have profile name data.
    console.warn("Could not fetch Sonarr language profiles (may be Sonarr v4+, non-fatal).");
  }

  const allSeries = await client.getAllSeries();
  const result: SonarrSeriesData[] = [];

  for (const series of allSeries) {
    const episodes = await client.getEpisodes(series.id);

    const seasonMap = new Map<number, SonarrSeasonData>();
    for (const s of series.seasons) {
      seasonMap.set(s.seasonNumber, {
        seasonNumber: s.seasonNumber,
        monitored: s.monitored,
        totalEpisodes: s.statistics?.totalEpisodeCount ?? 0,
        episodesWithFiles: s.statistics?.episodeFileCount ?? 0,
      });
    }

    const episodeData: SonarrEpisodeData[] = episodes.map((ep) => ({
      seasonNumber: ep.seasonNumber,
      episodeNumber: ep.episodeNumber,
      title: ep.title ?? `Episode ${ep.episodeNumber}`,
      hasFile: ep.hasFile,
      monitored: ep.monitored,
      hasAired: ep.airDateUtc
        ? new Date(ep.airDateUtc) <= new Date()
        : false,
    }));

    // Resolve language profile ID to name
    const profileId = series.languageProfileId;
    const languageProfileName =
      profileId != null ? languageProfileMap.get(profileId) ?? null : null;

    result.push({
      sonarrId: series.id,
      title: series.title,
      tvdbId: series.tvdbId ? String(series.tvdbId) : null,
      imdbId: series.imdbId ?? null,
      monitored: series.monitored,
      episodes: episodeData,
      seasons: Array.from(seasonMap.values()),
      languageProfileName,
    });
  }

  return result;
}
