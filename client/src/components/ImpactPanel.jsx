import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

// Click-to-inspect side panel: attributes, inbound ("needed by / depends on")
// and outbound ("enables / delivers") links, plus fan-in / fan-out impact counts
// (direct + transitive) from the impact endpoint.
export default function ImpactPanel({
  entity, entities, relationships, types, colorOf, labelOf,
  onSelect, onClose, onEdit, onDelete, onDeleteLink, onAddLink,
}) {
  const byId = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  const relLabel = useMemo(() => {
    const m = {};
    types.relationship_types.forEach((rt) => { m[rt.key] = rt.label; });
    return m;
  }, [types]);

  const outbound = relationships.filter((r) => r.from_id === entity.id);
  const inbound = relationships.filter((r) => r.to_id === entity.id);

  const [impact, setImpact] = useState({ out: null, in: null });
  useEffect(() => {
    let active = true;
    setImpact({ out: null, in: null });
    Promise.all([api.impact(entity.id, 'out'), api.impact(entity.id, 'in')]).then(([o, i]) => {
      if (active) setImpact({ out: o.count, in: i.count });
    });
    return () => { active = false; };
  }, [entity.id, relationships]);

  const schema = types.entity_types.find((t) => t.key === entity.type)?.attribute_schema || [];
  const filledAttrs = schema.filter((s) => entity.attributes[s.key] !== undefined && entity.attributes[s.key] !== '');

  const isTech = entity.type === 'technology';
  const isProject = entity.type === 'project';

  return (
    <aside className="side">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3>{entity.name}</h3>
          <div className="type-line">
            <span className="swatch" style={{ background: colorOf[entity.type] }} />
            {labelOf[entity.type]}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={onEdit}>Edit</button>
        <button onClick={onAddLink}>+ Link</button>
        <button className="danger" onClick={onDelete}>Delete</button>
      </div>

      {/* Impact summary */}
      <div className="section-title">Impact</div>
      <div className="attr-row">
        <span className="k">{isTech ? 'Enables (fan-out)' : 'Reaches downstream (fan-out)'}</span>
        <span><span className="badge">{impact.out ?? '…'}</span></span>
      </div>
      <div className="attr-row">
        <span className="k">{isProject ? 'Needed to deliver (fan-in)' : 'Depends on / needed by (fan-in)'}</span>
        <span><span className="badge">{impact.in ?? '…'}</span></span>
      </div>

      {/* Attributes */}
      {filledAttrs.length > 0 && (
        <>
          <div className="section-title">Attributes</div>
          {filledAttrs.map((s) => (
            <div className="attr-row" key={s.key}>
              <span className="k">{s.label}</span>
              <span>{String(entity.attributes[s.key])}</span>
            </div>
          ))}
        </>
      )}

      {/* Outbound */}
      <div className="section-title">Outbound — {entity.type === 'technology' ? 'enables / delivers' : 'this points to'}</div>
      {outbound.length === 0 && <div className="muted small">No outbound links.</div>}
      {outbound.map((r) => {
        const t = byId.get(r.to_id);
        return (
          <div className="link-item" key={r.id}>
            <span className="rel">{relLabel[r.type] || r.type}{r.attributes.kind ? ` · ${r.attributes.kind}` : ''} →</span>
            <span className="swatch" style={{ background: colorOf[t?.type] }} />
            <span className="nm" onClick={() => t && onSelect(t.id)}>{t?.name || '?'}</span>
            <button className="danger small" style={{ marginLeft: 'auto', padding: '2px 7px' }} onClick={() => onDeleteLink(r.id)}>✕</button>
          </div>
        );
      })}

      {/* Inbound */}
      <div className="section-title">Inbound — needed by / depends on</div>
      {inbound.length === 0 && <div className="muted small">No inbound links.</div>}
      {inbound.map((r) => {
        const f = byId.get(r.from_id);
        return (
          <div className="link-item" key={r.id}>
            <span className="swatch" style={{ background: colorOf[f?.type] }} />
            <span className="nm" onClick={() => f && onSelect(f.id)}>{f?.name || '?'}</span>
            <span className="rel">{relLabel[r.type] || r.type}{r.attributes.kind ? ` · ${r.attributes.kind}` : ''} → this</span>
            <button className="danger small" style={{ marginLeft: 'auto', padding: '2px 7px' }} onClick={() => onDeleteLink(r.id)}>✕</button>
          </div>
        );
      })}
    </aside>
  );
}
