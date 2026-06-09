// Excel round-trip per the deterministic contract:
//   - One sheet per entity type, named by the type label. Columns: `name` first,
//     then one column per attribute key for that type.
//   - One `Relationships` sheet. Columns: from_type, from_name, relationship,
//     to_type, to_name, kind.
// Import upserts entities by (type, name), creates missing entities referenced
// by relationships, and validates every edge against the grammar.

import * as XLSX from 'xlsx';
import { validateAttributes, findLegalEdge, getEntityType } from './validate.js';

function allTypes(db) {
  return db
    .prepare('SELECT * FROM entity_types ORDER BY rowid')
    .all()
    .map((t) => ({ ...t, attribute_schema: JSON.parse(t.attribute_schema) }));
}

export function exportWorkbook(db) {
  const wb = XLSX.utils.book_new();
  const types = allTypes(db);
  const labelToType = new Map(types.map((t) => [t.key, t]));

  for (const t of types) {
    const rows = db.prepare('SELECT * FROM entities WHERE type = ? ORDER BY name').all(t.key);
    const data = rows.map((r) => {
      const attrs = JSON.parse(r.attributes);
      const obj = { name: r.name };
      for (const spec of t.attribute_schema) obj[spec.key] = attrs[spec.key] ?? '';
      return obj;
    });
    const header = ['name', ...t.attribute_schema.map((s) => s.key)];
    const ws = XLSX.utils.json_to_sheet(data, { header });
    // Sheet names are capped at 31 chars by the format.
    XLSX.utils.book_append_sheet(wb, ws, t.label.slice(0, 31));
  }

  // Relationships sheet
  const rels = db
    .prepare(
      `SELECT r.type AS relationship, r.attributes,
              ef.type AS from_type, ef.name AS from_name,
              et.type AS to_type,   et.name AS to_name
       FROM relationships r
       JOIN entities ef ON ef.id = r.from_id
       JOIN entities et ON et.id = r.to_id
       ORDER BY r.id`
    )
    .all();
  const relData = rels.map((r) => ({
    from_type: r.from_type,
    from_name: r.from_name,
    relationship: r.relationship,
    to_type: r.to_type,
    to_name: r.to_name,
    kind: JSON.parse(r.attributes).kind ?? '',
  }));
  const relWs = XLSX.utils.json_to_sheet(relData, {
    header: ['from_type', 'from_name', 'relationship', 'to_type', 'to_name', 'kind'],
  });
  XLSX.utils.book_append_sheet(wb, relWs, 'Relationships');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function importWorkbook(db, buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const types = allTypes(db);
  const labelToType = new Map(types.map((t) => [t.label, t]));

  const report = { created: 0, updated: 0, relationships: 0, rejected: [] };

  const findEntity = db.prepare('SELECT id, attributes FROM entities WHERE type = ? AND name = ?');
  const insertEntity = db.prepare('INSERT INTO entities (type, name, attributes) VALUES (?, ?, ?)');
  const updateEntity = db.prepare("UPDATE entities SET attributes = ?, updated_at = datetime('now') WHERE id = ?");

  const tx = db.transaction(() => {
    // 1. Entities — one sheet per type label.
    for (const t of types) {
      const ws = wb.Sheets[t.label] || wb.Sheets[t.label.slice(0, 31)];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      for (const row of rows) {
        const name = String(row.name ?? '').trim();
        if (!name) continue;
        const raw = {};
        for (const spec of t.attribute_schema) {
          if (row[spec.key] !== undefined && row[spec.key] !== '') raw[spec.key] = row[spec.key];
        }
        const { ok, errors, attributes } = validateAttributes(t.attribute_schema, raw);
        if (!ok) {
          report.rejected.push({ sheet: t.label, name, reason: errors.join('; ') });
          continue;
        }
        upsertEntity(t.key, name, attributes);
      }
    }

    // 2. Relationships — resolve names to ids, creating missing entities.
    const relWs = wb.Sheets['Relationships'];
    if (relWs) {
      const rows = XLSX.utils.sheet_to_json(relWs, { defval: '' });
      for (const row of rows) {
        const fromType = String(row.from_type ?? '').trim();
        const fromName = String(row.from_name ?? '').trim();
        const key = String(row.relationship ?? '').trim();
        const toType = String(row.to_type ?? '').trim();
        const toName = String(row.to_name ?? '').trim();
        const kind = String(row.kind ?? '').trim();
        if (!fromName || !toName || !key) continue;

        const legal = findLegalEdge(db, key, fromType, toType);
        if (!legal) {
          report.rejected.push({
            sheet: 'Relationships',
            name: `${fromName} -[${key}]-> ${toName}`,
            reason: `Illegal edge: ${fromType} -[${key}]-> ${toType} is not in the grammar`,
          });
          continue;
        }

        const fromId = ensureEntity(fromType, fromName);
        const toId = ensureEntity(toType, toName);
        const attrs = {};
        if (kind && legal.attribute_schema) attrs.kind = kind;

        const exists = db
          .prepare('SELECT id FROM relationships WHERE type = ? AND from_id = ? AND to_id = ?')
          .get(key, fromId, toId);
        if (!exists) {
          db.prepare('INSERT INTO relationships (type, from_id, to_id, attributes) VALUES (?, ?, ?, ?)').run(
            key, fromId, toId, JSON.stringify(attrs)
          );
        } else {
          db.prepare('UPDATE relationships SET attributes = ? WHERE id = ?').run(JSON.stringify(attrs), exists.id);
        }
        report.relationships += 1;
      }
    }
  });

  function upsertEntity(typeKey, name, attributes) {
    const found = findEntity.get(typeKey, name);
    if (found) {
      updateEntity.run(JSON.stringify(attributes), found.id);
      report.updated += 1;
      return found.id;
    }
    const info = insertEntity.run(typeKey, name, JSON.stringify(attributes));
    report.created += 1;
    return info.lastInsertRowid;
  }

  function ensureEntity(typeKey, name) {
    const found = findEntity.get(typeKey, name);
    if (found) return found.id;
    if (!getEntityType(db, typeKey)) throw new Error(`Unknown entity type "${typeKey}" in Relationships sheet`);
    const info = insertEntity.run(typeKey, name, '{}');
    report.created += 1;
    return info.lastInsertRowid;
  }

  tx();
  return report;
}
