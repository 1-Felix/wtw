# wtw - What to Watch

A self-hosted dashboard that shows what's ready to watch across your Jellyfin, Sonarr, and Radarr media stack. It applies configurable readiness rules — like waiting for a complete season or a preferred audio language — so you only see media that's actually ready.

## Features

- **Ready to Watch** — series seasons and movies that pass all your readiness checks
- **Almost Ready** — items close to meeting criteria (e.g. a season that's 90% available)
- **Continue Watching** — in-progress items based on Jellyfin watch history
- **Language Overview** — per-episode audio/subtitle language breakdown
- **Configurable rules** — complete season, language availability, fully monitored, with per-series overrides
- **Graceful degradation** — if Sonarr or Radarr goes down, last known data is retained
- **Health monitoring** — built-in `/api/health` endpoint with per-service status
- **Read-only** — never mutates data on any connected service

## Quick Start

### Docker Compose (recommended)

Create a `docker-compose.yml`:

```yaml
services:
  wtw:
    image: ghcr.io/1-felix/wtw:latest
    container_name: wtw
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      JELLYFIN_URL: "http://jellyfin:8096"
      JELLYFIN_API_KEY: "your-jellyfin-api-key"

      # Optional: enable Sonarr integration
      # SONARR_URL: "http://sonarr:8989"
      # SONARR_API_KEY: "your-sonarr-api-key"

      # Optional: enable Radarr integration
      # RADARR_URL: "http://radarr:7878"
      # RADARR_API_KEY: "your-radarr-api-key"
    # volumes:
      # Optional: mount a rules config for advanced settings
      # - ./rules.json:/config/rules.json:ro
```

```bash
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

### Build from Source

```bash
docker build -t wtw .
docker run -p 3000:3000 \
  -e JELLYFIN_URL="http://jellyfin:8096" \
  -e JELLYFIN_API_KEY="your-key" \
  wtw
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JELLYFIN_URL` | Yes | — | Jellyfin server URL |
| `JELLYFIN_API_KEY` | Yes | — | Jellyfin API key |
| `SONARR_URL` | No | — | Sonarr server URL |
| `SONARR_API_KEY` | No | — | Sonarr API key |
| `RADARR_URL` | No | — | Radarr server URL |
| `RADARR_API_KEY` | No | — | Radarr API key |
| `SYNC_INTERVAL_MINUTES` | No | `15` | How often to re-sync data from services |

Jellyfin is the only required integration. Sonarr and Radarr are optional — when configured, they provide richer metadata (monitored status, language profiles) that powers additional readiness rules.

## Rules Configuration

By default, all rules are enabled and evaluate in AND mode (all must pass). You can customize behavior by mounting a `rules.json` file at `/config/rules.json`.

### Default Configuration

```json
{
  "rules": {
    "completeSeason": true,
    "languageAvailable": true,
    "fullyMonitored": true
  },
  "languageTarget": "English",
  "almostReadyThreshold": 0.8,
  "compositionMode": "and",
  "overrides": {}
}
```

### Options

| Key | Type | Default | Description |
|---|---|---|---|
| `rules.completeSeason` | `boolean` | `true` | Require all aired episodes to have files |
| `rules.languageAvailable` | `boolean` | `true` | Require target audio language on all episodes |
| `rules.fullyMonitored` | `boolean` | `true` | Require all episodes to be monitored in Sonarr |
| `languageTarget` | `string` | `"English"` | Target audio language |
| `almostReadyThreshold` | `number` | `0.8` | Progress threshold (0-1) for "almost ready" status |
| `compositionMode` | `"and" \| "or"` | `"and"` | Whether all rules must pass or just one |
| `overrides` | `object` | `{}` | Per-series rule overrides (keyed by title or TVDB ID) |

### Per-Series Overrides

Override rules for specific series. Keys can be the series title or TVDB ID:

```json
{
  "overrides": {
    "One Piece": {
      "disabledRules": ["complete-season"],
      "languageTarget": "Japanese"
    },
    "12345": {
      "languageTarget": "German"
    }
  }
}
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Service connection statuses and sync state |
| `/api/media` | GET | All media with readiness verdicts |
| `/api/media/continue` | GET | In-progress items with playback position |
| `/api/media/[id]/languages` | GET | Per-episode language breakdown for a series |
| `/api/sync` | POST | Trigger a manual sync |
| `/api/images/[itemId]` | GET | Proxy poster images from Jellyfin |

## Development

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/)

### Setup

```bash
pnpm install
```

### Running

```bash
# Create .env.local with your service URLs and API keys
pnpm dev
```

### Testing

```bash
pnpm test          # single run
pnpm test:watch    # watch mode
```

### Type Checking

```bash
pnpm exec tsc --noEmit
```

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router) with TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4 + [shadcn/ui](https://ui.shadcn.com/)
- [Zod](https://zod.dev/) v4 for runtime validation
- [Vitest](https://vitest.dev/) for testing
- Docker (multi-stage build, Node.js Alpine)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Dashboard UI                      │
│  Ready to Watch │ Almost Ready │ Continue │ Languages │
├─────────────────────────────────────────────────────┤
│                  Readiness Engine                     │
│  complete-season │ language-available │ fully-monitored│
├─────────────────────────────────────────────────────┤
│               In-Memory Cache + Merger               │
├───────────────┬───────────────┬──────────────────────┤
│   Jellyfin    │    Sonarr     │       Radarr         │
│   Client      │    Client     │       Client         │
└───────────────┴───────────────┴──────────────────────┘
```

- **Sync layer** fetches data from all configured services on a timer, merges it into a unified model, and stores it in an in-memory cache
- **Readiness engine** evaluates each season/movie against enabled rules and produces a verdict (ready / almost-ready / not-ready)
- **Dashboard** renders server-side from the cache — no database needed
- On restart, a full re-sync runs automatically (first load may take ~30 seconds)

## License

MIT
