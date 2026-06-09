import { useMemo, useState } from 'react';

// Type-tabbed, inline-editable grid. The fast data-entry surface; mirrors the
// Excel layout (name first, then one column per attribute).
export default function TableView({ types, entities, onSelect, selectedId, onEdit, onDelete, onNew, onInlineSave }) {
  const [activeType, setActiveType] = useState(types.entity_types[0].key);
  const [editingCell, setEditingCell] = useState(null); // { id, key }

  const type = types.entity_types.find((t) => t.key === activeType);
  const rows = useMemo(() => entities.filter((e) => e.type === activeType), [entities, activeType]);
  const countByType = useMemo(() => {
    const m = {};
    entities.forEach((e) => { m[e.type] = (m[e.type] || 0) + 1; });
    return m;
  }, [entities]);

  async function commit(entity, key, value) {
    const attributes = { ...entity.attributes };
    if (value === '' || value === null) delete attributes[key];
    else attributes[key] = value;
    setEditingCell(null);
    await onInlineSave(entity.id, { name: entity.name, attributes });
  }

  return (
    <>
      <div className="type-tabs">
        {types.entity_types.map((t) => (
          <button
            key={t.key}
            className={`type-tab ${activeType === t.key ? 'active' : ''}`}
            style={activeType === t.key ? { borderColor: t.color, color: t.color } : undefined}
            onClick={() => setActiveType(t.key)}
          >
            <span className="swatch" style={{ background: t.color }} />
            {t.label} <span className="muted">({countByType[t.key] || 0})</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="primary" onClick={() => onNew(activeType)}>+ {type.label}</button>
      </div>

      <div className="table-wrap">
        {rows.length === 0 ? (
          <div className="empty">No {type.label.toLowerCase()} yet. Click “+ {type.label}” to add one.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>name</th>
                {type.attribute_schema.map((s) => <th key={s.key}>{s.key}</th>)}
                <th style={{ textAlign: 'right' }}>actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} style={selectedId === e.id ? { background: '#f5f4fc' } : undefined}>
                  <td><span className="linkish" onClick={() => onSelect(e.id)}>{e.name}</span></td>
                  {type.attribute_schema.map((s) => {
                    const isEditing = editingCell && editingCell.id === e.id && editingCell.key === s.key;
                    return (
                      <td key={s.key} className="cell-edit" onClick={() => !isEditing && setEditingCell({ id: e.id, key: s.key })}>
                        {isEditing ? (
                          <CellEditor spec={s} value={e.attributes[s.key] ?? ''} onCommit={(v) => commit(e, s.key, v)} onCancel={() => setEditingCell(null)} />
                        ) : (
                          <span>{fmt(e.attributes[s.key])}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="actions">
                    <button onClick={() => onEdit(e)} style={{ padding: '3px 9px' }}>Edit</button>{' '}
                    <button className="danger" onClick={() => onDelete(e.id)} style={{ padding: '3px 9px' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function CellEditor({ spec, value, onCommit, onCancel }) {
  const [v, setV] = useState(value);
  const commit = () => onCommit(v);
  if (spec.type === 'select') {
    return (
      <select autoFocus value={v} onChange={(e) => onCommit(e.target.value)} onBlur={commit}>
        <option value="">—</option>
        {spec.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input
      autoFocus
      type={spec.type === 'number' ? 'number' : spec.type === 'date' ? 'date' : 'text'}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }}
    />
  );
}

function fmt(v) {
  if (v === undefined || v === null || v === '') return '—';
  return String(v);
}
