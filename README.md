<p align="center">
  <img src="docs/og-image.png" alt="wtw — What to Watch" width="600" />
</p>

<p align="center">
  <strong>A self-hosted dashboard that shows what's ready to watch across your Jellyfin, Sonarr, and Radarr media stack.</strong>
</p>

<p align="center">
  <a href="https://github.com/1-Felix/wtw/pkgs/container/wtw"><img src="https://img.shields.io/badge/ghcr.io-wtw-blue?logo=docker" alt="Docker Image" /></a>
  <a href="https://github.com/1-Felix/wtw/releases"><img src="https://img.shields.io/github/v/release/1-Felix/wtw?color=%23f59e0b" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/1-Felix/wtw" alt="License" /></a>
</p>

---

wtw applies configurable readiness rules — like waiting for a complete season or a preferred audio language — so you only see media that's actually ready. It syncs data from your services on a schedule, evaluates each season and movie, and presents the results in a clean dashboard.

![Ready to Watch](docs/screenshots/ready-to-watch.png)

## Features

- **Ready to Watch** — series seasons and movies that pass all your readiness checks
- **Almost Ready** — items close to meeting criteria with progress indicators
- **Continue Watching** — in-progress items based on Jellyfin watch history
- **Language Overview** — per-episode audio/subtitle language breakdown grid
- **Detail Panel** — click any card to see rule results, episode status, and languages
- **Settings UI** — configure rules, language targets, overrides, and webhooks from the browser
- **Discord & Webhook Notifications** — get notified when media becomes ready
- **Dismiss Items** — hide items you don't want to see, undo anytime from Settings
- **Mobile-First** — responsive layout with bottom tab bar, swipe-to-dismiss detail panel
- **Configurable Rules** — complete season, language availability, fully monitored, with per-series overrides
- **Graceful Degradation** — if Sonarr or Radarr goes down, last known data is retained
- **Read-Only** — never mutates data on any connected service
- **SQLite Persistence** — settings, dismissed items, and notification history survive container restarts

<details>
<summary>More screenshots</summary>

### Detail Panel
![Detail Panel](docs/screenshots/detail-panel.png)

### Almost Ready
![Almost Ready](docs/screenshots/almost-ready.png)

### Settings
![Settings](docs/screenshots/settings.png)

### Mobile
<img src="docs/screenshots/mobile.png" alt="Mobile" width="390" />

</details>

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
    volumes:
      # Recommended: persist settings, notifications, and dismissed items
      - wtw-config:/config

volumes:
  wtw-config:
```

```bash
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). The first sync takes ~30 seconds.

### Docker Run

```bash
docker run -d \
  --name wtw \
  -p 3000:3000 \
  -e JELLYFIN_URL="http://jellyfin:8096" \
  -e JELLYFIN_API_KEY="your-key" \
  -v wtw-config:/config \
  ghcr.io/1-felix/wtw:latest
```

## Configuration

### Environment Variables

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

### Settings UI

All rule configuration can be managed from the **Settings** page in the dashboard:

- **Rules** — toggle complete season, language availability, fully monitored
- **Language** — set target audio language, composition mode (AND/OR), almost-ready threshold
- **Overrides** — per-series rule overrides (disable rules, change language target)
- **Notifications** — add Discord or generic webhooks, configure filters (ready / almost-ready)
- **Dismissed Items** — view and un-dismiss hidden items
- **About** — service connection status, sync interval, database info

### rules.json (legacy)

You can also configure rules via a JSON file mounted at `/config/rules.json`. On first startup, wtw automatically imports the file into its database. After that, changes are managed through the Settings UI.

<details>
<summary>rules.json reference</summary>

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
  "overrides": {
    "One Piece": {
      "disabledRules": ["complete-season"],
      "languageTarget": "Japanese"
    }
  }
}
```

| Key | Type | Default | Description |
|---|---|---|---|
| `rules.completeSeason` | `boolean` | `true` | Require all aired episodes to have files |
| `rules.languageAvailable` | `boolean` | `true` | Require target audio language on all episodes |
| `rules.fullyMonitored` | `boolean` | `true` | Require all episodes to be monitored in Sonarr |
| `languageTarget` | `string` | `"English"` | Target audio language (name or ISO code) |
| `almostReadyThreshold` | `number` | `0.8` | Progress threshold (0–1) for "almost ready" |
| `compositionMode` | `"and" \| "or"` | `"and"` | Whether all rules must pass or just one |
| `overrides` | `object` | `{}` | Per-series rule overrides (keyed by title or TVDB ID) |

</details>

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Service status, sync state, version info |
| `/api/media` | GET | All media with readiness verdicts |
| `/api/media/continue` | GET | In-progress items with playback position |
| `/api/media/[id]/languages` | GET | Per-episode language breakdown for a series |
| `/api/media/[id]/dismiss` | POST/DELETE | Dismiss or un-dismiss a media item |
| `/api/settings` | GET/PUT | Read or update rule configuration |
| `/api/webhooks` | GET/POST | List or create notification webhooks |
| `/api/webhooks/[id]` | PUT/DELETE | Update or delete a webhook |
| `/api/webhooks/[id]/test` | POST | Send a test notification |
| `/api/dismissed` | GET | List all dismissed items |
| `/api/sync` | POST | Trigger a manual sync |
| `/api/images/[itemId]` | GET | Proxy poster images from Jellyfin |

## Development

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/)

### Setup

```bash
git clone https://github.com/1-Felix/wtw.git
cd wtw
pnpm install
```

### Running

```bash
# Create .env.local with your service URLs and API keys
cp .env.example .env.local  # edit with your values

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

### Docker Build

```bash
docker build -t wtw .
docker run -p 3000:3000 -e JELLYFIN_URL="..." -e JELLYFIN_API_KEY="..." wtw
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Dashboard UI                      │
│  Ready │ Almost Ready │ Continue │ Languages │ Settings│
├──────────────────────────────────────────────────────┤
│                  Readiness Engine                      │
│  complete-season │ language-available │ fully-monitored │
├──────────────────────────────────────────────────────┤
│          In-Memory Cache + Sync Orchestrator           │
├────────────┬──────────────┬───────────────────────────┤
│  Jellyfin  │    Sonarr     │          Radarr           │
│  Client    │    Client     │          Client           │
├────────────┴──────────────┴───────────────────────────┤
│     SQLite (settings, webhooks, dismissed, notif log)  │
└───────────────────────────────────────────────────────┘
```

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router) with TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4 + [shadcn/ui](https://ui.shadcn.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for embedded persistence
- [Zod](https://zod.dev/) v4 for runtime validation
- [Vitest](https://vitest.dev/) for testing
- Docker (multi-stage build, Node.js 22 Alpine)

## License

MIT
