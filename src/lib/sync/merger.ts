import type { Series, Movie } from "@/lib/models/media";
import type { SonarrSeriesData } from "./sonarr-sync";
import type { RadarrMovieData } from "./radarr-sync";

/**
 * Merge Jellyfin series data with Sonarr data.
 * Matches by TVDB ID, then IMDB ID, then title as fallback.
 */
export function mergeSeries(
  jellyfinSeries: Series[],
  sonarrData: SonarrSeriesData[]
): Series[] {
  const sonarrByTvdb = new Map<string, SonarrSeriesData>();
  const sonarrByImdb = new Map<string, SonarrSeriesData>();
  const sonarrByTitle = new Map<string, SonarrSeriesData>();

  for (const s of sonarrData) {
    if (s.tvdbId) sonarrByTvdb.set(s.tvdbId, s);
    if (s.imdbId) sonarrByImdb.set(s.imdbId, s);
    sonarrByTitle.set(s.title.toLowerCase(), s);
  }

  return jellyfinSeries.map((series) => {
    const match =
      (series.tvdbId ? sonarrByTvdb.get(series.tvdbId) : undefined) ??
      (series.imdbId ? sonarrByImdb.get(series.imdbId) : undefined) ??
      sonarrByTitle.get(series.title.toLowerCase());

    if (!match) return series;

    // Merge Sonarr episode data into Jellyfin seasons
    const mergedSeasons = series.seasons.map((season) => {
      const sonarrSeason = match.seasons.find(
        (s) => s.seasonNumber === season.seasonNumber
      );
      const sonarrEpisodes = match.episodes.filter(
        (e) => e.seasonNumber === season.seasonNumber
      );

      // Update episode-level data
      const mergedEpisodes = season.episodes.map((episode) => {
        const sonarrEp = sonarrEpisodes.find(
          (e) => e.episodeNumber === episode.episodeNumber
        );
        if (!sonarrEp) return episode;

        return {
          ...episode,
          hasFile: sonarrEp.hasFile || episode.hasFile,
          hasAired: sonarrEp.hasAired || episode.hasAired,
          airDateUtc: sonarrEp.airDateUtc ?? episode.airDateUtc,
          isMonitored: sonarrEp.monitored,
        };
      });

      // Add Sonarr-only episodes (not yet in Jellyfin)
      for (const sonarrEp of sonarrEpisodes) {
        const exists = mergedEpisodes.find(
          (e) => e.episodeNumber === sonarrEp.episodeNumber
        );
        if (!exists) {
          mergedEpisodes.push({
            id: `sonarr-${match.sonarrId}-s${sonarrEp.seasonNumber}e${sonarrEp.episodeNumber}`,
            title: sonarrEp.title,
            seasonNumber: sonarrEp.seasonNumber,
            episodeNumber: sonarrEp.episodeNumber,
            hasFile: sonarrEp.hasFile,
            hasAired: sonarrEp.hasAired,
            airDateUtc: sonarrEp.airDateUtc,
            isMonitored: sonarrEp.monitored,
            isWatched: false,
            playbackProgress: null,
            lastPlayed: null,
            audioStreams: [],
            subtitleStreams: [],
          });
        }
      }

      // Sort episodes by number
      mergedEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

      return {
        ...season,
        totalEpisodes: sonarrSeason?.totalEpisodes ?? mergedEpisodes.length,
        availableEpisodes: mergedEpisodes.filter((e) => e.hasFile).length,
        airedEpisodes: mergedEpisodes.filter((e) => e.hasAired).length,
        episodes: mergedEpisodes,
      };
    });

    return {
      ...series,
      inSonarr: true,
      languageProfile: match.languageProfileName ?? series.languageProfile,
      seasons: mergedSeasons,
    };
  });
}

/**
 * Merge Jellyfin movie data with Radarr data.
 * Matches by TMDB ID, then IMDB ID, then title as fallback.
 */
export function mergeMovies(
  jellyfinMovies: Movie[],
  radarrData: RadarrMovieData[]
): Movie[] {
  const radarrByTmdb = new Map<string, RadarrMovieData>();
  const radarrByImdb = new Map<string, RadarrMovieData>();
  const radarrByTitle = new Map<string, RadarrMovieData>();

  for (const m of radarrData) {
    if (m.tmdbId) radarrByTmdb.set(m.tmdbId, m);
    if (m.imdbId) radarrByImdb.set(m.imdbId, m);
    radarrByTitle.set(m.title.toLowerCase(), m);
  }

  return jellyfinMovies.map((movie) => {
    const match =
      (movie.tmdbId ? radarrByTmdb.get(movie.tmdbId) : undefined) ??
      (movie.imdbId ? radarrByImdb.get(movie.imdbId) : undefined) ??
      radarrByTitle.get(movie.title.toLowerCase());

    if (!match) return movie;

    // If Radarr has language info and Jellyfin doesn't, supplement it
    const audioStreams =
      movie.audioStreams.length > 0
        ? movie.audioStreams
        : match.audioLanguages.map((lang) => ({
            language: lang,
            isDefault: false,
          }));

    return {
      ...movie,
      hasFile: match.hasFile || movie.hasFile,
      isMonitored: match.monitored,
      audioStreams,
      inRadarr: true,
    };
  });
}
