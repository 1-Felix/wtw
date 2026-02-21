import { describe, it, expect } from "vitest";
import { mergeSeries, mergeMovies } from "./merger";
import type { Series, Movie } from "@/lib/models/media";
import type { SonarrSeriesData } from "./sonarr-sync";
import type { RadarrMovieData } from "./radarr-sync";

function makeJellyfinSeries(overrides: Partial<Series> = {}): Series {
  return {
    id: "jf-1",
    title: "Test Series",
    year: 2024,
    posterImageId: null,
    tvdbId: "12345",
    imdbId: null,
    dateAdded: "2024-01-01",
    seasons: [
      {
        seasonNumber: 1,
        title: "Season 1",
        totalEpisodes: 2,
        availableEpisodes: 2,
        airedEpisodes: 2,
        episodes: [
          {
            id: "ep1", title: "Episode 1", seasonNumber: 1, episodeNumber: 1,
            hasFile: true, hasAired: true, isMonitored: null, isWatched: false,
            playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
          },
          {
            id: "ep2", title: "Episode 2", seasonNumber: 1, episodeNumber: 2,
            hasFile: true, hasAired: true, isMonitored: null, isWatched: false,
            playbackProgress: null, lastPlayed: null, audioStreams: [], subtitleStreams: [],
          },
        ],
      },
    ],
    languageProfile: null,
    inJellyfin: true,
    inSonarr: false,
    ...overrides,
  };
}

function makeSonarrData(overrides: Partial<SonarrSeriesData> = {}): SonarrSeriesData {
  return {
    sonarrId: 1,
    title: "Test Series",
    tvdbId: "12345",
    imdbId: null,
    monitored: true,
    episodes: [
      { seasonNumber: 1, episodeNumber: 1, title: "Episode 1", hasFile: true, monitored: true, hasAired: true },
      { seasonNumber: 1, episodeNumber: 2, title: "Episode 2", hasFile: true, monitored: true, hasAired: true },
      { seasonNumber: 1, episodeNumber: 3, title: "Episode 3", hasFile: false, monitored: true, hasAired: false },
    ],
    seasons: [
      { seasonNumber: 1, monitored: true, totalEpisodes: 3, episodesWithFiles: 2 },
    ],
    languageProfileName: "English",
    ...overrides,
  };
}

describe("mergeSeries", () => {
  it("merges Sonarr data into Jellyfin series by TVDB ID", () => {
    const jfSeries = [makeJellyfinSeries()];
    const sonarrData = [makeSonarrData()];
    const result = mergeSeries(jfSeries, sonarrData);

    expect(result).toHaveLength(1);
    expect(result[0].inSonarr).toBe(true);
    expect(result[0].languageProfile).toBe("English");
  });

  it("adds Sonarr-only episodes not present in Jellyfin", () => {
    const jfSeries = [makeJellyfinSeries()];
    const sonarrData = [makeSonarrData()];
    const result = mergeSeries(jfSeries, sonarrData);

    const season1 = result[0].seasons[0];
    expect(season1.episodes).toHaveLength(3);
    expect(season1.episodes[2].episodeNumber).toBe(3);
    expect(season1.episodes[2].hasFile).toBe(false);
    expect(season1.episodes[2].isMonitored).toBe(true);
  });

  it("updates total episodes from Sonarr season statistics", () => {
    const jfSeries = [makeJellyfinSeries()];
    const sonarrData = [makeSonarrData()];
    const result = mergeSeries(jfSeries, sonarrData);

    expect(result[0].seasons[0].totalEpisodes).toBe(3);
  });

  it("returns unmodified series when no Sonarr match exists", () => {
    const jfSeries = [makeJellyfinSeries({ tvdbId: "99999", title: "Unmatched Series" })];
    const sonarrData = [makeSonarrData()];
    const result = mergeSeries(jfSeries, sonarrData);

    expect(result[0].inSonarr).toBe(false);
    expect(result[0].seasons[0].episodes).toHaveLength(2);
  });

  it("matches by title when IDs don't match", () => {
    const jfSeries = [makeJellyfinSeries({ tvdbId: null })];
    const sonarrData = [makeSonarrData({ tvdbId: null })];
    const result = mergeSeries(jfSeries, sonarrData);

    expect(result[0].inSonarr).toBe(true);
  });

  it("merges monitoring data from Sonarr into Jellyfin episodes", () => {
    const jfSeries = [makeJellyfinSeries()];
    const sonarrData = [makeSonarrData()];
    const result = mergeSeries(jfSeries, sonarrData);

    expect(result[0].seasons[0].episodes[0].isMonitored).toBe(true);
    expect(result[0].seasons[0].episodes[1].isMonitored).toBe(true);
  });
});

describe("mergeMovies", () => {
  function makeJellyfinMovie(overrides: Partial<Movie> = {}): Movie {
    return {
      id: "jf-m1",
      title: "Test Movie",
      year: 2024,
      posterImageId: null,
      tmdbId: "67890",
      imdbId: null,
      dateAdded: "2024-01-01",
      hasFile: true,
      isMonitored: null,
      isWatched: false,
      playbackProgress: null,
      lastPlayed: null,
      audioStreams: [{ language: "English", isDefault: true }],
      subtitleStreams: [],
      inJellyfin: true,
      inRadarr: false,
      ...overrides,
    };
  }

  function makeRadarrData(overrides: Partial<RadarrMovieData> = {}): RadarrMovieData {
    return {
      radarrId: 1,
      title: "Test Movie",
      tmdbId: "67890",
      imdbId: null,
      monitored: true,
      hasFile: true,
      audioLanguages: ["English"],
      ...overrides,
    };
  }

  it("merges Radarr data into Jellyfin movie by TMDB ID", () => {
    const jfMovies = [makeJellyfinMovie()];
    const radarrData = [makeRadarrData()];
    const result = mergeMovies(jfMovies, radarrData);

    expect(result[0].inRadarr).toBe(true);
    expect(result[0].isMonitored).toBe(true);
  });

  it("returns unmodified movie when no Radarr match exists", () => {
    const jfMovies = [makeJellyfinMovie({ tmdbId: "99999", title: "Unmatched Movie" })];
    const radarrData = [makeRadarrData()];
    const result = mergeMovies(jfMovies, radarrData);

    expect(result[0].inRadarr).toBe(false);
  });

  it("supplements audio streams from Radarr when Jellyfin has none", () => {
    const jfMovies = [makeJellyfinMovie({ audioStreams: [] })];
    const radarrData = [makeRadarrData({ audioLanguages: ["English", "Spanish"] })];
    const result = mergeMovies(jfMovies, radarrData);

    expect(result[0].audioStreams).toHaveLength(2);
    expect(result[0].audioStreams[0].language).toBe("English");
    expect(result[0].audioStreams[1].language).toBe("Spanish");
  });

  it("keeps Jellyfin audio streams when available", () => {
    const jfMovies = [makeJellyfinMovie({
      audioStreams: [{ language: "Japanese", isDefault: true }],
    })];
    const radarrData = [makeRadarrData({ audioLanguages: ["English"] })];
    const result = mergeMovies(jfMovies, radarrData);

    expect(result[0].audioStreams).toHaveLength(1);
    expect(result[0].audioStreams[0].language).toBe("Japanese");
  });
});
