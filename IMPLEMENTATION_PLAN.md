# WellWire Lite — Implementation Plan

## Overview

WellWire Lite is a low-cost web application for small U.S. oil and gas operators,
mineral owners, and brokers. V1 covers Texas and North Dakota.

---

## Milestones

### M1 — Project Scaffold (Done first)
- [x] Initialize Next.js 14 App Router + TypeScript + Tailwind CSS
- [x] Configure Prisma with PostgreSQL
- [x] Define normalized data schema
- [x] Run initial migration
- [x] Wire `.env` / `DATABASE_URL`

### M2 — Data Model & Seed
- [x] Schema: states, counties, operators, wells, permits, production, watchlists, alert_rules, alerts
- [x] Prisma migrations
- [x] Seed script with realistic Texas + North Dakota sample data (~50 wells, permits, production rows)

### M3 — Core API Routes
- [x] `GET /api/search` — full-text search by API#, operator, county, well name; paginated
- [x] `GET /api/wells/[api]` — well detail with permit + production timeline
- [x] `GET/POST/DELETE /api/watchlists` — CRUD watchlists + wells
- [x] `GET /api/export` — CSV export for search results or watchlist
- [x] `POST /api/alerts/check` — trigger alert evaluation (called by cron)

### M4 — Search UI
- [x] Home page with search bar (API#, operator, county, well name)
- [x] Results table with sortable columns
- [x] "Add to watchlist" action on each row
- [x] CSV export button

### M5 — Well Detail UI
- [x] Well header: name, API, operator, county, state, status, coordinates
- [x] Permit/completion/production timeline
- [x] Production chart (simple table-based for MVP)
- [x] Back-to-search navigation

### M6 — Watchlists UI
- [x] List of saved watchlists
- [x] Watchlist detail: wells table + alert rules
- [x] Add/remove wells, set alert rules (new permit, status change, first production)
- [x] CSV export per watchlist

### M7 — Ingestion Scripts
- [x] `scripts/ingest-texas.ts` — fetches from Texas RRC public data (stubs with real URLs)
- [x] `scripts/ingest-nd.ts` — fetches from NDIC public data (stubs with real URLs)
- [x] Idempotent upsert logic (re-runnable safely)

### M8 — Alert Job
- [x] `scripts/send-alerts.ts` — evaluates alert rules, creates Alert records, sends email stubs
- [x] Email abstraction via `nodemailer` (SMTP env vars, defaults to console log)

### M9 — Tests
- [x] Unit tests for CSV parsing utilities
- [x] Unit tests for search query builder
- [x] Unit tests for alert rule evaluation logic

### M10 — Documentation
- [x] README.md — setup, data sources, commands
- [x] CLAUDE.md — project conventions, common commands

---

## Data Sources (Public)

| State | Dataset | URL |
|-------|---------|-----|
| Texas | RRC Well Permit Query | https://rrc.texas.gov/resource-center/research/data-sets-available-for-download/ |
| Texas | RRC Production Data | https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/ |
| North Dakota | NDIC Well Search | https://www.dmr.nd.gov/oilgas/bakkenwells.asp |
| North Dakota | NDIC Production | https://www.dmr.nd.gov/oilgas/productionstats.asp |

---

## Directory Structure

```
wellwire/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← Search home
│   │   ├── wells/[api]/page.tsx  ← Well detail
│   │   ├── watchlists/page.tsx   ← Watchlists list
│   │   ├── watchlists/[id]/page.tsx ← Watchlist detail
│   │   └── api/
│   │       ├── search/route.ts
│   │       ├── wells/[api]/route.ts
│   │       ├── watchlists/route.ts
│   │       ├── watchlists/[id]/route.ts
│   │       ├── watchlists/[id]/wells/route.ts
│   │       ├── alerts/check/route.ts
│   │       └── export/route.ts
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── WellsTable.tsx
│   │   ├── WatchlistPanel.tsx
│   │   ├── ProductionTable.tsx
│   │   └── AlertBadge.tsx
│   └── lib/
│       ├── prisma.ts
│       ├── search.ts
│       ├── alerts.ts
│       ├── csv.ts
│       └── demo-user.ts
├── scripts/
│   ├── ingest-texas.ts
│   ├── ingest-nd.ts
│   └── send-alerts.ts
└── tests/
    ├── parsing.test.ts
    ├── search.test.ts
    └── alerts.test.ts
```

---

## Key Decisions

- **Auth**: Demo mode only (v1). A single hard-coded demo user is auto-seeded.
  Real auth can be added with NextAuth in v2.
- **State extensibility**: `State` table + `state_code` FK on Wells/Counties.
  Adding New Mexico = insert a row + point ingestion at NM data.
- **Email**: Abstracted via `lib/mailer.ts`. Defaults to `console.log`.
  Set `SMTP_HOST/USER/PASS` to enable real delivery.
- **No billing, no multi-tenant** in v1.
