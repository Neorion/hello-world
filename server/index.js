import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import db from './db.js';
import { getEntityType, validateAttributes, findLegalEdge } from './validate.js';
import { traverse } from './impact.js';
import { exportWorkbook, importWorkbook } from './excel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const parseEntity = (e) => ({ ...e, attributes: JSON.parse(e.attributes) });
const parseRel = (r) => ({ ...r, attributes: JSON.parse(r.attributes) });

// --- Types (metamodel) ---
app.get('/api/types', (req, res) => {
  const entity_types = db
    .prepare('SELECT * FROM entity_types ORDER BY rowid')
    .all()
    .map((t) => ({ ...t, attribute_schema: JSON.parse(t.attribute_schema) }));
  const relationship_types = db
    .prepare('SELECT * FROM relationship_types ORDER BY id')
    .all()
    .map((t) => ({ ...t, attribute_schema: t.attribute_schema ? JSON.parse(t.attribute_schema) : null }));
  res.json({ entity_types, relationship_types });
});

// --- Entities ---
app.get('/api/entities', (req, res) => {
  const { type, q } = req.query;
  const clauses = [];
  const params = [];
  if (type) { clauses.push('type = ?'); params.push(type); }
  if (q) { clauses.push('name LIKE ?'); params.push(`%${q}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM entities ${where} ORDER BY name`).all(...params);
  res.json(rows.map(parseEntity));
});

app.get('/api/entities/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM entities WHERE id = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json(parseEntity(e));
});

app.post('/api/entities', (req, res) => {
  const { type, name, attributes = {} } = req.body || {};
  const et = getEntityType(db, type);
  if (!et) return res.status(400).json({ error: `Unknown entity type "${type}"` });
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });

  const { ok, errors, attributes: clean } = validateAttributes(et.attribute_schema, attributes);
  if (!ok) return res.status(400).json({ error: 'Invalid attributes', details: errors });

  const info = db
    .prepare('INSERT INTO entities (type, name, attributes) VALUES (?, ?, ?)')
    .run(type, String(name).trim(), JSON.stringify(clean));
  res.status(201).json(parseEntity(db.prepare('SELECT * FROM entities WHERE id = ?').get(info.lastInsertRowid)));
});

app.put('/api/entities/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM entities WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const et = getEntityType(db, existing.type);

  const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const attributes = req.body.attributes !== undefined ? req.body.attributes : JSON.parse(existing.attributes);
  const { ok, errors, attributes: clean } = validateAttributes(et.attribute_schema, attributes);
  if (!ok) return res.status(400).json({ error: 'Invalid attributes', details: errors });

  db.prepare("UPDATE entities SET name = ?, attributes = ?, updated_at = datetime('now') WHERE id = ?")
    .run(name, JSON.stringify(clean), req.params.id);
  res.json(parseEntity(db.prepare('SELECT * FROM entities WHERE id = ?').get(req.params.id)));
});

app.delete('/api/entities/:id', (req, res) => {
  const info = db.prepare('DELETE FROM entities WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true }); // relationships cascade via FK
});

// --- Relationships ---
app.get('/api/relationships', (req, res) => {
  const { type } = req.query;
  const where = type ? 'WHERE type = ?' : '';
  const rows = db.prepare(`SELECT * FROM relationships ${where} ORDER BY id`).all(...(type ? [type] : []));
  res.json(rows.map(parseRel));
});

app.post('/api/relationships', (req, res) => {
  const { type, from_id, to_id, attributes = {} } = req.body || {};
  const from = db.prepare('SELECT * FROM entities WHERE id = ?').get(from_id);
  const to = db.prepare('SELECT * FROM entities WHERE id = ?').get(to_id);
  if (!from || !to) return res.status(400).json({ error: 'from_id and to_id must reference existing entities' });

  // The grammar check — reject any edge not declared in relationship_types.
  const legal = findLegalEdge(db, type, from.type, to.type);
  if (!legal) {
    return res.status(400).json({
      error: `Illegal edge: ${from.type} -[${type}]-> ${to.type} is not allowed by the relationship grammar`,
    });
  }

  let clean = {};
  if (legal.attribute_schema) {
    const schema = JSON.parse(legal.attribute_schema);
    const v = validateAttributes(schema, attributes);
    if (!v.ok) return res.status(400).json({ error: 'Invalid edge attributes', details: v.errors });
    clean = v.attributes;
  }

  const info = db
    .prepare('INSERT INTO relationships (type, from_id, to_id, attributes) VALUES (?, ?, ?, ?)')
    .run(type, from_id, to_id, JSON.stringify(clean));
  res.status(201).json(parseRel(db.prepare('SELECT * FROM relationships WHERE id = ?').get(info.lastInsertRowid)));
});

app.delete('/api/relationships/:id', (req, res) => {
  const info = db.prepare('DELETE FROM relationships WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

// --- Impact (fan-in / fan-out traversal) ---
app.get('/api/entities/:id/impact', (req, res) => {
  const direction = req.query.direction === 'in' ? 'in' : 'out';
  const depth = req.query.depth ? parseInt(req.query.depth, 10) : 0;
  const result = traverse(db, parseInt(req.params.id, 10), direction, depth);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});

// --- Saved views ---
app.get('/api/views', (req, res) => {
  const rows = db.prepare('SELECT * FROM saved_views ORDER BY id').all();
  res.json(rows.map((v) => ({ ...v, config: JSON.parse(v.config) })));
});
app.post('/api/views', (req, res) => {
  const { name, kind, config = {} } = req.body || {};
  if (!name || !kind) return res.status(400).json({ error: 'name and kind are required' });
  const info = db.prepare('INSERT INTO saved_views (name, kind, config) VALUES (?, ?, ?)')
    .run(name, kind, JSON.stringify(config));
  const v = db.prepare('SELECT * FROM saved_views WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ...v, config: JSON.parse(v.config) });
});
app.delete('/api/views/:id', (req, res) => {
  db.prepare('DELETE FROM saved_views WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// --- Excel I/O ---
app.get('/api/export', (req, res) => {
  const buf = exportWorkbook(db);
  res.setHeader('Content-Disposition', 'attachment; filename="throughline.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

app.post('/api/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: file)' });
  try {
    const report = importWorkbook(db, req.file.buffer);
    res.json(report);
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});

// --- Serve built frontend (production) ---
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[throughline] API + app listening on http://localhost:${PORT}`);
});
