import { useMemo, useState } from 'react';

// Type-driven create/edit form. `name` is the only required field — every
// attribute is optional so a node can be created in seconds.
export default function EntityForm({ types, entity, defaultType, onCancel, onSave }) {
  const isEdit = !!entity;
  const [typeKey, setTypeKey] = useState(entity?.type || defaultType || types.entity_types[0].key);
  const [name, setName] = useState(entity?.name || '');
  const [attrs, setAttrs] = useState(entity?.attributes || {});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const type = useMemo(() => types.entity_types.find((t) => t.key === typeKey), [types, typeKey]);

  function setAttr(key, value) {
    setAttrs((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      // strip empties so optional fields stay clean
      const clean = {};
      for (const [k, v] of Object.entries(attrs)) if (v !== '' && v !== null && v !== undefined) clean[k] = v;
      await onSave({ type: typeKey, name: name.trim(), attributes: clean });
    } catch (err) {
      setError(err.details ? `${err.message}: ${err.details.join(', ')}` : err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={submit}>
        <h2>{isEdit ? 'Edit' : 'New'} {type.label.toLowerCase()}</h2>
        <p className="sub">
          <span className="swatch" style={{ background: type.color }} /> Only a name is required — enrich the rest later.
        </p>

        {error && <div className="error-box">{error}</div>}

        {!isEdit && (
          <div className="field">
            <label>Type</label>
            <select value={typeKey} onChange={(e) => { setTypeKey(e.target.value); setAttrs({}); }}>
              {types.entity_types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
        )}

        <div className="field">
          <label>Name *</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. ${exampleFor(typeKey)}`} />
        </div>

        {type.attribute_schema.map((spec) => (
          <div className="field" key={spec.key}>
            <label>{spec.label}</label>
            <AttrInput spec={spec} value={attrs[spec.key] ?? ''} onChange={(v) => setAttr(spec.key, v)} />
          </div>
        ))}

        <div className="modal-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function AttrInput({ spec, value, onChange }) {
  if (spec.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {spec.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (spec.type === 'textarea') {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (spec.type === 'number') {
    return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (spec.type === 'date') {
    return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input value={value} onChange={(e) => onChange(e.target.value)} />;
}

function exampleFor(typeKey) {
  return {
    value_stream: 'Upstream production',
    capability: 'Predictive maintenance',
    project: 'Historian upgrade',
    technology: 'Azure',
    theme: 'Data modernization',
  }[typeKey] || 'Name';
}
