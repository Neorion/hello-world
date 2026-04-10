# WellWire Lite — Claude Code Conventions

## Project Overview

WellWire Lite is a Next.js 16 (App Router) + Prisma 7 + PostgreSQL application.
V1 covers Texas and North Dakota oil & gas public data.

## Common Commands

```bash
# Start dev server
npm run dev

# Run all tests (51 tests, ~700ms)
npm test

# Seed/reseed demo data
npx tsx prisma/seed.ts

# Regenerate Prisma client after schema changes
npx prisma generate

# Apply schema changes as a new migration
npx prisma migrate dev --name <description>

# Reset DB and reseed from scratch
npx prisma migrate reset && npx tsx prisma/seed.ts

# Run alert job (dry run)
DRY_RUN=true npx tsx scripts/send-alerts.ts
```

## Architecture

- **Framework**: Next.js 16 App Router, TypeScript, Tailwind CSS v4
- **Database**: PostgreSQL 16 via Prisma 7 (using `@prisma/adapter-pg`)
- **Client**: `src/lib/prisma.ts` — global singleton with PrismaPg adapter
- **Auth**: Demo mode only in V1 — `DEMO_USER_ID=1` in `src/lib/demo-user.ts`

## Prisma 7 Notes (IMPORTANT)

Prisma 7 is a breaking change from v5/v6:

1. **No `url` in schema.prisma** — connection URL lives in `prisma.config.ts`
2. **Driver adapter required** — instantiate client with `new PrismaPg({ connectionString })`
3. **Generated client path** — `src/generated/prisma/client` (not `@prisma/client`)
4. **Config file** — `prisma.config.ts` at root with `datasource.url`

```ts
// Correct Prisma client import:
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
```

## File Conventions

- API routes live in `src/app/api/*/route.ts` — use `NextRequest` / `NextResponse`
- Dynamic params are `Promise<{ id: string }>` — always `await params`
- Client components start with `"use client"` directive
- Lib files (`src/lib/`) are server-side only — no browser APIs
- Scripts in `scripts/` use `tsx` directly with `dotenv/config`

## Search

Search logic is in `src/lib/search.ts:searchWells()`.
Uses Prisma `mode: "insensitive"` for case-insensitive string matching.
Free-text `q` parameter searches: API#, well name, operator name, county.

## Alerts

Alert evaluation is in `src/lib/alerts.ts:evaluateAlerts()`.
Called by:
1. `POST /api/alerts/check` — REST endpoint (called by cron or manually)
2. `scripts/send-alerts.ts` — standalone cron script

Alert rule types: `NEW_PERMIT`, `STATUS_CHANGE`, `FIRST_PRODUCTION`, `PRODUCTION_THRESHOLD`.
Deduplication: checks for existing alert before creating (based on time window).

## Data Ingestion

Scripts in `scripts/`:
- `ingest-texas.ts` — Texas RRC data
- `ingest-nd.ts` — North Dakota NDIC data

Run with `--stub` flag to load from `prisma/fixtures/*.csv` instead of real network calls.
Both scripts are idempotent (upsert logic).

## Testing

Tests use Vitest with module mocking for Prisma.
All DB calls are mocked — tests do not require a live database.

```bash
npm test                # run once
npx vitest run          # same
npx vitest              # watch mode
```

Test files in `tests/`:
- `parsing.test.ts` — CSV parsing, API# format validation
- `search.test.ts` — search query building, pagination, filtering
- `alerts.test.ts` — alert rule evaluation for all 4 rule types

## Adding Features

### New state (e.g. New Mexico)
1. Add state row in seed or ingestion script
2. Create `scripts/ingest-nm.ts` following `ingest-texas.ts` pattern
3. No schema changes required (State table already handles any state code)

### New alert rule type
1. Add enum value to `AlertRuleType` in `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add-new-rule-type`
3. Add evaluation case in `src/lib/alerts.ts:evaluateAlerts()`
4. Add UI option in `src/app/watchlists/[id]/page.tsx` alert rules tab
5. Add test in `tests/alerts.test.ts`

### Real authentication (V2)
1. `npm install next-auth`
2. Replace `getDemoUserId()` in `src/lib/demo-user.ts` with session lookup
3. Protect all API routes with session check

## Code Style

- No unnecessary abstractions — prefer direct Prisma calls over repositories
- No error swallowing — log errors before returning 500 responses
- Keep API routes thin — business logic belongs in `src/lib/`
- TypeScript strict mode — no `any` casts
- Tailwind for all styling — no CSS modules or inline styles
