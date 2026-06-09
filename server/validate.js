// Attribute and relationship-grammar validation.

export function getEntityType(db, key) {
  const row = db.prepare('SELECT * FROM entity_types WHERE key = ?').get(key);
  if (!row) return null;
  return { ...row, attribute_schema: JSON.parse(row.attribute_schema) };
}

// Validate (and lightly coerce) an attributes object against a type's schema.
// Only `name` is required at the entity level — every attribute is optional
// unless its schema entry sets required:true. Unknown keys are rejected so the
// data stays clean. Returns { ok, errors, attributes }.
export function validateAttributes(schema, attributes) {
  const errors = [];
  const out = {};
  const byKey = new Map(schema.map((s) => [s.key, s]));

  for (const [k, v] of Object.entries(attributes || {})) {
    if (!byKey.has(k)) {
      errors.push(`Unknown attribute "${k}"`);
      continue;
    }
    if (v === null || v === undefined || v === '') continue; // empty is allowed
    const spec = byKey.get(k);
    if (spec.type === 'number') {
      const n = Number(v);
      if (Number.isNaN(n)) errors.push(`"${spec.label}" must be a number`);
      else out[k] = n;
    } else if (spec.type === 'select') {
      if (spec.options && !spec.options.includes(v)) {
        errors.push(`"${spec.label}" must be one of: ${spec.options.join(', ')}`);
      } else out[k] = v;
    } else {
      out[k] = v;
    }
  }

  for (const spec of schema) {
    if (spec.required) {
      const v = out[spec.key];
      if (v === undefined || v === null || v === '') errors.push(`"${spec.label}" is required`);
    }
  }

  return { ok: errors.length === 0, errors, attributes: out };
}

// Find the relationship_type row that legalises an edge for a (key, fromType, toType).
export function findLegalEdge(db, key, fromType, toType) {
  return db
    .prepare('SELECT * FROM relationship_types WHERE key = ? AND from_type = ? AND to_type = ?')
    .get(key, fromType, toType);
}
