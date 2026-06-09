# Lattice — strategic planning tool

A metamodel-driven strategic planning tool for business and solution architects.
Map **projects, capabilities, value streams, technologies and themes** — and the
**typed relationships** between them — then traverse those relationships in two
directions:

- **Fan-out** — *"how many things does this technology enable?"* (outbound traversal)
- **Fan-in** — *"what must happen to deliver this project?"* (inbound traversal)

Because the value is in the graph traversals, the data model is a **typed property
graph** (SQLite), not flat tables.

## Stack

| Layer        | Choice |
|--------------|--------|
| Database     | SQLite (`planner.db`, via `better-sqlite3`) |
| Backend      | Node.js + Express (REST API + serves the built frontend) |
| Frontend     | React + Vite (SPA) |
| Graph view   | Cytoscape.js |
| Timeline     | vis-timeline |
| Excel I/O    | SheetJS (`xlsx`) |

## Run it

```bash
npm install        # installs server + (via postinstall) client deps
npm run build      # builds the React app into client/dist
npm start          # serves API + app at http://localhost:3001
```

The database is created and **seeded automatically on first launch** (oil & gas
sample data), so the app is populated immediately.

### Development (hot reload)

```bash
npm install
npm run dev        # Express on :3001 (--watch) + Vite dev server on :5173
```

Open http://localhost:5173 — the Vite dev server proxies `/api` to Express.

## The metamodel

The entity types, their attributes, and the **legal relationships** (the
relationship grammar) are themselves stored as data (`entity_types`,
`relationship_types`), which is what lets new types and views be added without a
code change.

### Entity types

| Type | Colour | Key attributes |
|------|--------|----------------|
| Value stream | `#1D9E75` | description, owner, priority (H/M/L), maturity |
| Capability   | `#0F6E56` | description, current/target maturity (1–5), owner |
| Project      | `#534AB7` | status, start/end date, sponsor, percent_complete, budget |
| Technology   | `#185FA5` | vendor, lifecycle, hosting, owner |
| Theme        | `#5F5E5A` | description, sponsor |

Only **name** is required on any entity.

### Relationship grammar (the only legal edges)

| key | from → to | edge attributes |
|-----|-----------|-----------------|
| `enables`    | technology → capability | — |
| `enables`    | technology → project | — |
| `realizes`   | project → capability | — |
| `delivers`   | capability → value_stream | — |
| `groups`     | theme → project | — |
| `depends_on` | project → project | `kind`: technical \| organizational \| governance \| other |

A relationship is **rejected on insert** if the `from`/`to` entity types don't
match a row in `relationship_types`. The "add link" picker only ever offers
legal edges for the selected pair.

> Note: the blueprint lists `relationship_types.key` as a primary key, but the
> grammar uses `enables` for two different type pairs. The implementation uses a
> surrogate id with `UNIQUE(key, from_type, to_type)` so both rows can coexist.

## REST API

```
GET    /api/types                            entity_types + relationship_types
GET    /api/entities?type=&q=                list / filter
POST   /api/entities                         create (validates attributes vs schema)
PUT    /api/entities/:id                      update
DELETE /api/entities/:id                      delete (cascades relationships)
GET    /api/relationships?type=              list
POST   /api/relationships                    create (rejects illegal edges)
DELETE /api/relationships/:id                 delete
GET    /api/entities/:id/impact?direction=out|in&depth=   BFS traversal + count
POST   /api/import                           .xlsx upload, upsert by name, validate edges
GET    /api/export                           .xlsx download
```

## Excel round-trip

- One sheet per entity type, named by the type label. Columns: `name` first, then
  one column per attribute key.
- One `Relationships` sheet: `from_type, from_name, relationship, to_type, to_name, kind`.

Import resolves names → ids, creates missing entities, upserts existing by
(`type`, `name`), and validates every edge against the grammar (reporting rejected
rows). Export writes the current database back into this exact structure, so an
exported `.xlsx` re-imports with zero data loss.

## Views

1. **Network graph** (hero) — Cytoscape, nodes coloured by type and sized by
   fan-out, click-to-inspect side panel, filter chips by type and theme.
2. **Roadmap** — projects on a date axis, swim-lanes by theme or by the value
   stream they deliver.
3. **Table** — type-tabbed, inline-editable grid mirroring the Excel layout.

Saved custom views, an add-new-type UI and a dependency matrix are stretch goals
(the data layer already supports them via `saved_views`).
