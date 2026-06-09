-- Throughline — metamodel-driven strategic planning tool.
-- The metamodel (entity types, attributes, legal relationships) is stored as data,
-- so new types and views can be added without a code change.

PRAGMA foreign_keys = ON;

-- The types themselves (so new types can be added via the UI later).
CREATE TABLE IF NOT EXISTS entity_types (
  key              TEXT PRIMARY KEY,        -- 'value_stream'
  label            TEXT NOT NULL,           -- 'Value stream'
  color            TEXT NOT NULL,           -- '#1D9E75'
  attribute_schema TEXT NOT NULL            -- JSON: [{key,label,type,required,options}]
);

-- The legal edges (from_type -> to_type). Enforces the relationship grammar.
-- NOTE: the blueprint shows `key` as the sole PRIMARY KEY, but the grammar lists
-- `enables` for two different (from_type,to_type) pairs. A surrogate id with a
-- UNIQUE(key, from_type, to_type) constraint represents the grammar faithfully.
CREATE TABLE IF NOT EXISTS relationship_types (
  id               INTEGER PRIMARY KEY,
  key              TEXT NOT NULL,           -- 'enables'
  label            TEXT NOT NULL,           -- 'enables'
  from_type        TEXT NOT NULL,           -- 'technology'
  to_type          TEXT NOT NULL,           -- 'capability'
  attribute_schema TEXT,                    -- JSON (e.g. dependency 'kind')
  UNIQUE (key, from_type, to_type)
);

CREATE TABLE IF NOT EXISTS entities (
  id          INTEGER PRIMARY KEY,
  type        TEXT NOT NULL REFERENCES entity_types(key),
  name        TEXT NOT NULL,
  attributes  TEXT NOT NULL DEFAULT '{}',   -- JSON, validated against entity_types.attribute_schema
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS relationships (
  id          INTEGER PRIMARY KEY,
  type        TEXT NOT NULL,
  from_id     INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_id       INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  attributes  TEXT NOT NULL DEFAULT '{}',   -- JSON, e.g. {"kind":"governance"}
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Custom / saved views
CREATE TABLE IF NOT EXISTS saved_views (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  kind    TEXT NOT NULL,                    -- 'graph' | 'roadmap' | 'table' | 'matrix'
  config  TEXT NOT NULL                     -- JSON: visible types, filters, layout, time range
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_rel_from ON relationships(from_id);
CREATE INDEX IF NOT EXISTS idx_rel_to ON relationships(to_id);
