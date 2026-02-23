import { JellyfinClient, extractStreams, extractWatchStatus, extractProviderIds } from "@/lib/clients/jellyfin";
import type { Series, Season, Episode, Movie } from "@/lib/models/media";

export interface JellyfinSyncResult {
  series: Series[];
  movies: Movie[];
}

export async function syncJellyfin(
  client: JellyfinClient
): Promise<JellyfinSyncResult> {
  const libraries = await client.getLibraries();
  const seriesList: Series[] = [];
  const movieList: Movie[] = [];

  for (const lib of libraries) {
    if (lib.CollectionType === "tvshows") {
      const items = await client.getSeries(lib.ItemId);

      for (const item of items) {
        const providerIds = extractProviderIds(item);
        const seasonsRaw = await client.getSeasons(item.Id);
        const seasons: Season[] = [];

        for (const seasonItem of seasonsRaw) {
          const seasonNum = seasonItem.IndexNumber ?? 0;
          // Skip specials (season 0) for readiness evaluation
          if (seasonNum === 0) continue;

          const episodesRaw = await client.getEpisodes(
            item.Id,
            seasonItem.Id
          );
          const episodes: Episode[] = episodesRaw.map((ep) => {
            const streams = extractStreams(ep);
            const watchStatus = extractWatchStatus(ep);
            const hasAired = ep.PremiereDate
              ? new Date(ep.PremiereDate) <= new Date()
              : true;

            return {
              id: ep.Id,
              title: ep.Name ?? `Episode ${ep.IndexNumber ?? 0}`,
              seasonNumber: ep.ParentIndexNumber ?? seasonNum,
              episodeNumber: ep.IndexNumber ?? 0,
              hasFile: true, // If it's in Jellyfin, the file exists
              hasAired,
              airDateUtc: ep.PremiereDate ?? null,
              isMonitored: null, // Will be filled by Sonarr merge
              ...watchStatus,
              ...streams,
            };
          });

          seasons.push({
            seasonNumber: seasonNum,
            title: seasonItem.Name ?? `Season ${seasonNum}`,
            totalEpisodes: seasonItem.ChildCount ?? episodes.length,
            availableEpisodes: episodes.length,
            airedEpisodes: episodes.filter((e) => e.hasAired).length,
            episodes,
          });
        }

        seriesList.push({
          id: item.Id,
          title: item.Name,
          year: item.ProductionYear ?? null,
          posterImageId: item.ImageTags?.Primary ? item.Id : null,
          tvdbId: providerIds.tvdbId,
          imdbId: providerIds.imdbId,
          dateAdded: item.DateCreated ?? new Date().toISOString(),
          seasons,
          languageProfile: null,
          inJellyfin: true,
          inSonarr: false,
        });
      }
    }

    if (lib.CollectionType === "movies") {
      const items = await client.getMovies(lib.ItemId);

      for (const item of items) {
        const providerIds = extractProviderIds(item);
        const streams = extractStreams(item);
        const watchStatus = extractWatchStatus(item);

        movieList.push({
          id: item.Id,
          title: item.Name,
          year: item.ProductionYear ?? null,
          posterImageId: item.ImageTags?.Primary ? item.Id : null,
          tmdbId: providerIds.tmdbId,
          imdbId: providerIds.imdbId,
          dateAdded: item.DateCreated ?? new Date().toISOString(),
          hasFile: true,
          isMonitored: null,
          ...watchStatus,
          ...streams,
          inJellyfin: true,
          inRadarr: false,
        });
      }
    }
  }

  return { series: seriesList, movies: movieList };
}
