# WellWire Lite

A low-cost web application for small U.S. oil and gas operators, mineral owners, and brokers.
Search wells, track activity, save watchlists, and receive alerts on new permits, status changes, and production.

**V1 covers Texas and North Dakota.**

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (if not running)
pg_ctlcluster 16 main start   # or: sudo systemctl start postgresql

# 3. Create database user and DB (one time)
sudo -u postgres psql -c "CREATE USER wellwire WITH PASSWORD 'wellwire' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE wellwire OWNER wellwire;"

# 4. Set up environment
cp .env.example .env   # or edit .env directly
# DATABASE_URL is already set for local dev by default

# 5. Run migrations
npx prisma migrate dev

# 6. Seed demo data (45 wells, permits, production, watchlists)
npx tsx prisma/seed.ts

# 7. Start the app
npm run dev
```

Open `http://localhost:3000`

---

## Features

| Feature | Status |
|---------|--------|
| Search by API#, operator, county, well name | ✅ |
| Filter by state (TX / ND) and status | ✅ |
| Well detail page with permits + production timeline | ✅ |
| Save watchlists | ✅ |
| Add/remove wells from watchlists | ✅ |
| Alert rules: new permit, status change, first production, production threshold | ✅ |
| CSV export for search results and watchlists | ✅ |
| Email notifications (console-logged without SMTP config) | ✅ |
| Texas RRC ingestion script | ✅ (stub + real URL) |
| North Dakota NDIC ingestion script | ✅ (stub + real URL) |

---

## Data Sources (Public)

| State | Dataset | URL |
|-------|---------|-----|
| Texas | RRC Well Permits | https://rrc.texas.gov/resource-center/research/data-sets-available-for-download/ |
| Texas | RRC Oil & Gas Production | https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/ |
| North Dakota | NDIC Well Search | https://www.dmr.nd.gov/oilgas/bakkenwells.asp |
| North Dakota | NDIC Production Stats | https://www.dmr.nd.gov/oilgas/productionstats.asp |

---

## Available Commands

```bash
# Development
npm run dev           # start Next.js dev server on :3000
npm run build         # production build
npm run start         # start production server
npm run lint          # ESLint
npm test              # run all tests (vitest)

# Database
npx prisma migrate dev          # run migrations
npx prisma migrate reset        # reset DB and re-run migrations
npx prisma studio               # open Prisma Studio GUI
npx prisma generate             # regenerate Prisma client

# Seeding
npx tsx prisma/seed.ts          # seed demo data (idempotent)

# Ingestion scripts
npx tsx scripts/ingest-texas.ts --stub       # load TX from prisma/fixtures/
npx tsx scripts/ingest-texas.ts              # show real RRC download instructions
npx tsx scripts/ingest-nd.ts --stub          # load ND from prisma/fixtures/
npx tsx scripts/ingest-nd.ts                 # show real NDIC download instructions

# Alert job (run manually or via cron)
npx tsx scripts/send-alerts.ts
DRY_RUN=true npx tsx scripts/send-alerts.ts  # evaluate only, don't send email
```

---

## Cron Setup (Linux/macOS)

```bash
# Run alert job at 6 AM daily
crontab -e
# Add:
0 6 * * * cd /path/to/wellwire && npx tsx scripts/send-alerts.ts >> /var/log/wellwire-alerts.log 2>&1

# Or via Next.js API endpoint (protectable with CRON_SECRET):
0 6 * * * curl -s -X POST http://localhost:3000/api/alerts/check -H "x-cron-secret: $CRON_SECRET"
```

---

## Environment Variables

```env
# Required
DATABASE_URL="postgresql://wellwire:wellwire@localhost:5432/wellwire"

# Optional — email (defaults to console.log if not set)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=alerts@wellwire.app
ALERT_EMAIL_TO=admin@example.com   # override recipient in demo mode

# Optional — cron security
CRON_SECRET=your-secret-here
```

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # data model
│   ├── migrations/            # SQL migrations
│   ├── seed.ts                # demo data seed
│   └── fixtures/              # CSV fixtures for --stub ingestion
├── src/
│   ├── app/
│   │   ├── page.tsx                     # search home
│   │   ├── wells/[api]/page.tsx         # well detail
│   │   ├── watchlists/page.tsx          # watchlists list
│   │   ├── watchlists/[id]/page.tsx     # watchlist detail
│   │   └── api/                         # API routes
│   │       ├── search/route.ts
│   │       ├── wells/[api]/route.ts
│   │       ├── watchlists/route.ts
│   │       ├── watchlists/[id]/route.ts
│   │       ├── watchlists/[id]/wells/route.ts
│   │       ├── watchlists/[id]/alert-rules/route.ts
│   │       ├── watchlists/[id]/alerts/route.ts
│   │       ├── export/route.ts
│   │       └── alerts/check/route.ts
│   ├── components/
│   │   ├── WellsTable.tsx
│   │   ├── ProductionTable.tsx
│   │   ├── StatusBadge.tsx
│   │   └── AlertBadge.tsx
│   ├── lib/
│   │   ├── prisma.ts           # PrismaClient singleton (PrismaPg adapter)
│   │   ├── search.ts           # well search logic
│   │   ├── alerts.ts           # alert evaluation
│   │   ├── csv.ts              # CSV parsing + generation
│   │   ├── mailer.ts           # email abstraction
│   │   └── demo-user.ts        # demo mode user
│   └── generated/prisma/       # auto-generated Prisma client
├── scripts/
│   ├── ingest-texas.ts         # Texas RRC ingestion
│   ├── ingest-nd.ts            # North Dakota NDIC ingestion
│   └── send-alerts.ts          # alert notification job
├── tests/
│   ├── parsing.test.ts         # CSV parsing tests (20 tests)
│   ├── search.test.ts          # search query builder tests (15 tests)
│   └── alerts.test.ts          # alert rule evaluation tests (16 tests)
├── IMPLEMENTATION_PLAN.md
├── CLAUDE.md
└── README.md
```

---

## Authentication

V1 uses **demo mode**: a single hard-coded user (`demo@wellwire.app`) is auto-seeded.
All API routes use this user. Auth (NextAuth + credentials or Google) should be added in V2.

---

## Adding a New State

1. Insert a row into the `states` table
2. Create counties and operators
3. Write `scripts/ingest-[state].ts` following the same pattern as `ingest-texas.ts`
4. Run ingestion: `npx tsx scripts/ingest-[state].ts --stub`
