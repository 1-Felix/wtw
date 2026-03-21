# Architecture Diagram

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Docker Container                           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Next.js Application                       │  │
│  │                                                               │  │
│  │  ┌─────────────────────┐    ┌──────────────────────────────┐  │  │
│  │  │      Frontend       │    │        API Routes            │  │  │
│  │  │   (React 19 + TS)   │───▶│        (/api/*)              │  │  │
│  │  │                     │    │                              │  │  │
│  │  │  ┌───────────────┐  │    │  /api/health                │  │  │
│  │  │  │ Ready to Watch│  │    │  /api/sync                  │  │  │
│  │  │  │ Almost Ready  │  │    │  /api/media                 │  │  │
│  │  │  │ Continue      │  │    │  /api/settings              │  │  │
│  │  │  │ Languages     │  │    │  /api/services/*            │  │  │
│  │  │  │ Settings      │  │    │  /api/webhooks              │  │  │
│  │  │  │ Setup Wizard  │  │    │  /api/images/*              │  │  │
│  │  │  └───────────────┘  │    │  /api/languages             │  │  │
│  │  └─────────────────────┘    └──────────┬───────────────────┘  │  │
│  │                                        │                      │  │
│  │           ┌────────────────────────────┼──────────────┐       │  │
│  │           │                            │              │       │  │
│  │           ▼                            ▼              ▼       │  │
│  │  ┌────────────────┐  ┌─────────────────────┐  ┌───────────┐  │  │
│  │  │     Sync       │  │   Rules Evaluator   │  │Notification│  │  │
│  │  │  Orchestrator  │  │                     │  │ Dispatcher │  │  │
│  │  │                │  │ ┌─────────────────┐ │  │            │  │  │
│  │  │  Periodic +    │  │ │Complete Season  │ │  │ Transition │  │  │
│  │  │  Manual Sync   │  │ │Language Avail.  │ │  │ Detection  │  │  │
│  │  │                │  │ │Fully Monitored  │ │  │            │  │  │
│  │  │  ┌──────────┐  │  │ └─────────────────┘ │  │ Duplicate  │  │  │
│  │  │  │In-Memory │  │  └─────────────────────┘  │ Prevention │  │  │
│  │  │  │  Cache    │  │                           └──────┬────┘  │  │
│  │  │  └──────────┘  │                                  │       │  │
│  │  └───────┬────────┘                                  │       │  │
│  │          │                                           │       │  │
│  │          │         ┌─────────────────────┐           │       │  │
│  │          │         │   SQLite Database   │           │       │  │
│  │          ├────────▶│   (/config/wtw.db)  │◀──────────┤       │  │
│  │          │         │                     │           │       │  │
│  │          │         │  • Settings         │           │       │  │
│  │          │         │  • Webhooks Config  │           │       │  │
│  │          │         │  • Notification Log │           │       │  │
│  │          │         │  • Dismissed Items  │           │       │  │
│  │          │         └─────────────────────┘           │       │  │
│  │          │                                           │       │  │
│  └──────────┼───────────────────────────────────────────┼───────┘  │
│             │                                           │          │
└─────────────┼───────────────────────────────────────────┼──────────┘
              │                                           │
              ▼                                           ▼
┌──────────────────────────────────┐    ┌─────────────────────────────┐
│       External Services          │    │    Outbound Webhooks        │
│                                  │    │                             │
│  ┌──────────┐  ┌──────────────┐  │    │  ┌─────────┐  ┌─────────┐  │
│  │ Jellyfin │  │   Sonarr     │  │    │  │ Discord │  │ Generic │  │
│  │(required)│  │  (optional)  │  │    │  │Webhooks │  │Webhooks │  │
│  │          │  │              │  │    │  └─────────┘  └─────────┘  │
│  │• Library │  │• Monitoring  │  │    │                             │
│  │• History │  │• Seasons     │  │    │  Filters:                   │
│  │• Metadata│  │• Episodes    │  │    │  • Ready transitions        │
│  │• Streams │  │              │  │    │  • Almost-ready transitions  │
│  │• Images  │  ├──────────────┤  │    └─────────────────────────────┘
│  │          │  │   Radarr     │  │
│  │          │  │  (optional)  │  │
│  │          │  │              │  │
│  │          │  │• Movies      │  │
│  │          │  │• Monitoring  │  │
│  └──────────┘  └──────────────┘  │
└──────────────────────────────────┘
```

## Data Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Jellyfin │     │  Sonarr  │     │  Radarr  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     ▼                ▼                ▼
┌─────────────────────────────────────────────┐
│              Sync Orchestrator               │
│                                             │
│  1. Fetch data from each service            │
│  2. Merge Jellyfin + Arr metadata           │
│  3. Store in in-memory cache                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│              Rules Evaluator                 │
│                                             │
│  For each media item, evaluate:             │
│  • Complete Season — all episodes present?  │
│  • Language Available — desired audio/subs? │
│  • Fully Monitored — tracked in Sonarr?     │
│                                             │
│  Verdict: ready | almost-ready | not-ready  │
└─────────────────┬───────────────────────────┘
                  │
          ┌───────┴───────┐
          ▼               ▼
┌──────────────┐  ┌───────────────┐
│   Frontend   │  │ Notification  │
│   Display    │  │  Dispatcher   │
│              │  │               │
│ • Media Grid │  │ Detect state  │
│ • Cards      │  │ transitions → │
│ • Filters    │  │ send webhooks │
└──────────────┘  └───────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────┐
│            Frontend                  │
│  Next.js 16 · React 19 · TypeScript │
│  Tailwind CSS 4 · Radix UI          │
│  Framer Motion · Lucide Icons       │
├─────────────────────────────────────┤
│            Backend                   │
│  Next.js API Routes · Zod           │
│  better-sqlite3 (WAL mode)          │
├─────────────────────────────────────┤
│          Infrastructure              │
│  Docker (Node 22-alpine)            │
│  GitHub Actions CI/CD               │
│  GHCR (multi-arch: amd64 + arm64)  │
├─────────────────────────────────────┤
│            Testing                   │
│  Vitest · Testing Library            │
│  Playwright (E2E)                    │
└─────────────────────────────────────┘
```

## Module Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Ready to Watch (home)
│   ├── almost-ready/       # Almost Ready view
│   ├── continue/           # Continue Watching view
│   ├── languages/          # Language breakdown grid
│   ├── settings/           # Configuration UI
│   ├── setup/              # First-run wizard
│   └── api/                # REST API endpoints
│
├── components/             # React components
│   ├── ui/                 # Shadcn UI primitives
│   ├── media-grid-view     # Main media display
│   ├── media-card          # Individual media cards
│   ├── detail-panel        # Item detail overlay
│   ├── sidebar             # Desktop navigation
│   └── bottom-tab-bar      # Mobile navigation
│
└── lib/                    # Core logic
    ├── clients/            # External API clients
    │   ├── jellyfin.ts     #   Jellyfin integration
    │   ├── sonarr.ts       #   Sonarr integration
    │   └── radarr.ts       #   Radarr integration
    ├── config/             # Configuration management
    ├── db/                 # SQLite database layer
    ├── models/             # Data types & interfaces
    ├── rules/              # Readiness evaluation
    │   ├── complete-season
    │   ├── language-available
    │   └── fully-monitored
    ├── sync/               # Sync orchestration
    └── notifications/      # Webhook dispatch
        ├── discord         #   Discord embeds
        └── generic         #   Generic JSON payloads
```
