import { useMemo, useState } from 'react';

// The signature moment: the picker offers only LEGAL edges for the selected
// pair. Pick a source and target entity, and only relationship types whose
// (from_type, to_type) match the grammar are offered.
export default function LinkPicker({ types, entities, initialFrom, onCancel, onCreate }) {
  const [fromId, setFromId] = useState(initialFrom?.id ?? '');
  const [toId, setToId] = useState('');
  const [relKey, setRelKey] = useState('');
  const [edgeAttrs, setEdgeAttrs] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const byId = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  const from = byId.get(Number(fromId));
  const to = byId.get(Number(toId));

  // Legal relationship types for the chosen (from_type -> to_type) pair.
  const legal = useMemo(() => {
    if (!from || !to) return [];
    return types.relationship_types.filter((rt) => rt.from_type === from.type && rt.to_type === to.type);
  }, [types, from, to]);

  const chosenRel = legal.find((r) => r.key === relKey) || (legal.length === 1 ? legal[0] : null);

  const grouped = useMemo(() => {
    const m = {};
    for (const t of types.entity_types) m[t.key] = { label: t.label, items: [] };
    for (const e of entities) m[e.type]?.items.push(e);
    return m;
  }, [types, entities]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const rel = chosenRel;
    if (!from || !to) { setError('Choose both a source and a target.'); return; }
    if (!rel) { setError('No legal relationship for this pair.'); return; }
    setSaving(true);
    try {
      await onCreate({ type: rel.key, from_id: from.id, to_id: to.id, attributes: edgeAttrs });
    } catch (err) {
      setError(err.details ? `${err.message}: ${err.details.join(', ')}` : err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={submit}>
        <h2>Add link</h2>
        <p className="sub">Only legal relationships for the selected pair are offered.</p>

        {error && <div className="error-box">{error}</div>}

        <div className="field">
          <label>From</label>
          <EntitySelect grouped={grouped} value={fromId} onChange={(v) => { setFromId(v); setRelKey(''); }} types={types} />
        </div>

        <div className="field">
          <label>To</label>
          <EntitySelect grouped={grouped} value={toId} onChange={(v) => { setToId(v); setRelKey(''); }} types={types} />
        </div>

        <div className="field">
          <label>Relationship</label>
          {!from || !to ? (
            <div className="muted small">Choose a source and target first.</div>
          ) : legal.length === 0 ? (
            <div className="error-box" style={{ margin: 0 }}>
              No legal link from a {typeLabel(types, from.type)} to a {typeLabel(types, to.type)}.
            </div>
          ) : (
            <select value={chosenRel?.key || ''} onChange={(e) => setRelKey(e.target.value)}>
              {legal.map((rt) => <option key={rt.id} value={rt.key}>{rt.label}</option>)}
            </select>
          )}
        </div>

        {chosenRel?.attribute_schema?.map((spec) => (
          <div className="field" key={spec.key}>
            <label>{spec.label}</label>
            {spec.type === 'select' ? (
              <select value={edgeAttrs[spec.key] ?? ''} onChange={(e) => setEdgeAttrs((p) => ({ ...p, [spec.key]: e.target.value }))}>
                <option value="">—</option>
                {spec.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input value={edgeAttrs[spec.key] ?? ''} onChange={(e) => setEdgeAttrs((p) => ({ ...p, [spec.key]: e.target.value }))} />
            )}
          </div>
        ))}

        <div className="modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary" disabled={saving || !chosenRel}>{saving ? 'Saving…' : 'Create link'}</button>
        </div>
      </form>
    </div>
  );
}

function EntitySelect({ grouped, value, onChange, types }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— choose —</option>
      {types.entity_types.map((t) => {
        const g = grouped[t.key];
        if (!g || g.items.length === 0) return null;
        return (
          <optgroup key={t.key} label={t.label}>
            {g.items.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </optgroup>
        );
      })}
    </select>
  );
}

function typeLabel(types, key) {
  return types.entity_types.find((t) => t.key === key)?.label.toLowerCase() || key;
}
