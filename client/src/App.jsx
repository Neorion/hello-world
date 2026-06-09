import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import TableView from './views/TableView.jsx';
import GraphView from './views/GraphView.jsx';
import RoadmapView from './views/RoadmapView.jsx';
import EntityForm from './components/EntityForm.jsx';
import LinkPicker from './components/LinkPicker.jsx';
import ImpactPanel from './components/ImpactPanel.jsx';

const VIEWS = [
  { key: 'table', label: 'Table' },
  { key: 'graph', label: 'Network graph' },
  { key: 'roadmap', label: 'Roadmap' },
];

export default function App() {
  const [types, setTypes] = useState(null);
  const [entities, setEntities] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [view, setView] = useState('graph');

  const [activeTypes, setActiveTypes] = useState(null); // Set of entity type keys shown
  const [themeFilter, setThemeFilter] = useState(null); // theme entity id or null

  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // entity object or {type} for new
  const [linking, setLinking] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const reloadData = useCallback(async () => {
    const [es, rs] = await Promise.all([api.listEntities(), api.listRelationships()]);
    setEntities(es);
    setRelationships(rs);
  }, []);

  useEffect(() => {
    (async () => {
      const t = await api.getTypes();
      setTypes(t);
      setActiveTypes(new Set(t.entity_types.map((x) => x.key)));
      await reloadData();
    })();
  }, [reloadData]);

  const colorOf = useMemo(() => {
    const m = {};
    types?.entity_types.forEach((t) => { m[t.key] = t.color; });
    return m;
  }, [types]);

  const labelOf = useMemo(() => {
    const m = {};
    types?.entity_types.forEach((t) => { m[t.key] = t.label; });
    return m;
  }, [types]);

  const themes = useMemo(() => entities.filter((e) => e.type === 'theme'), [entities]);

  // Apply type + theme filters to the entity set the views render.
  const visibleEntities = useMemo(() => {
    if (!activeTypes) return entities;
    let es = entities.filter((e) => activeTypes.has(e.type));
    if (themeFilter) {
      // Keep the theme itself, the projects it groups, and anything reachable from them.
      const grouped = new Set(
        relationships.filter((r) => r.type === 'groups' && r.from_id === themeFilter).map((r) => r.to_id)
      );
      const keep = new Set([themeFilter, ...grouped]);
      // include capabilities/value streams/technologies connected to grouped projects
      let changed = true;
      while (changed) {
        changed = false;
        for (const r of relationships) {
          if (keep.has(r.from_id) && !keep.has(r.to_id)) { keep.add(r.to_id); changed = true; }
          if (keep.has(r.to_id) && !keep.has(r.from_id)) { keep.add(r.from_id); changed = true; }
        }
      }
      es = es.filter((e) => keep.has(e.id));
    }
    return es;
  }, [entities, activeTypes, themeFilter, relationships]);

  const selected = entities.find((e) => e.id === selectedId) || null;

  function toggleType(key) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function saveEntity(payload) {
    if (editing.id) {
      await api.updateEntity(editing.id, payload);
      showToast('Entity updated');
    } else {
      const created = await api.createEntity(payload);
      setSelectedId(created.id);
      showToast(`${labelOf[payload.type]} created`);
    }
    setEditing(null);
    await reloadData();
  }

  async function deleteEntity(id) {
    if (!confirm('Delete this entity and its relationships?')) return;
    await api.deleteEntity(id);
    if (selectedId === id) setSelectedId(null);
    showToast('Entity deleted');
    await reloadData();
  }

  async function createLink(payload) {
    try {
      await api.createRelationship(payload);
      setLinking(false);
      showToast('Link created');
      await reloadData();
    } catch (e) {
      throw e; // surfaced in the LinkPicker
    }
  }

  async function deleteLink(id) {
    await api.deleteRelationship(id);
    showToast('Link removed');
    await reloadData();
  }

  async function exportExcel() {
    window.location.href = api.exportUrl;
  }

  async function importExcel(file) {
    try {
      const r = await api.importFile(file);
      const rejected = r.rejected?.length ? `, ${r.rejected.length} rejected` : '';
      showToast(`Imported: ${r.created} created, ${r.updated} updated, ${r.relationships} links${rejected}`);
      if (r.rejected?.length) console.warn('Rejected rows:', r.rejected);
      await reloadData();
    } catch (e) {
      showToast(`Import failed: ${e.message}`);
    }
  }

  if (!types) return <div className="empty">Loading Lattice…</div>;

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">Lattice<span className="dot">.</span></div>
        <div className="tabs">
          {VIEWS.map((v) => (
            <button key={v.key} className={`tab ${view === v.key ? 'active' : ''}`} onClick={() => setView(v.key)}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <button onClick={() => setLinking(true)}>+ Link</button>
        <button className="primary" onClick={() => setEditing({ type: 'project' })}>+ Entity</button>
        <ImportButton onFile={importExcel} />
        <button onClick={exportExcel}>Export .xlsx</button>
      </div>

      <div className="filters">
        {types.entity_types.map((t) => {
          const on = activeTypes.has(t.key);
          return (
            <span
              key={t.key}
              className={`chip ${on ? 'on' : ''}`}
              style={on ? { color: t.color } : undefined}
              onClick={() => toggleType(t.key)}
            >
              <span className="swatch" style={{ background: t.color }} />
              {t.label}
            </span>
          );
        })}
        <span style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px' }} />
        <span className="small muted">Theme:</span>
        <select
          style={{ width: 'auto', minWidth: 180 }}
          value={themeFilter ?? ''}
          onChange={(e) => setThemeFilter(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All themes</option>
          {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="main">
        <div className="content">
          {view === 'table' && (
            <TableView
              types={types}
              entities={visibleEntities}
              onSelect={setSelectedId}
              selectedId={selectedId}
              onEdit={(e) => setEditing(e)}
              onDelete={deleteEntity}
              onNew={(typeKey) => setEditing({ type: typeKey })}
              onInlineSave={async (id, payload) => { await api.updateEntity(id, payload); await reloadData(); }}
            />
          )}
          {view === 'graph' && (
            <GraphView
              types={types}
              entities={visibleEntities}
              relationships={relationships}
              colorOf={colorOf}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
          {view === 'roadmap' && (
            <RoadmapView
              entities={visibleEntities}
              relationships={relationships}
              themes={themes}
              colorOf={colorOf}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {selected && (
          <ImpactPanel
            entity={selected}
            entities={entities}
            relationships={relationships}
            types={types}
            colorOf={colorOf}
            labelOf={labelOf}
            onSelect={setSelectedId}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditing(selected)}
            onDelete={() => deleteEntity(selected.id)}
            onDeleteLink={deleteLink}
            onAddLink={() => setLinking(true)}
          />
        )}
      </div>

      {editing && (
        <EntityForm
          types={types}
          entity={editing.id ? editing : null}
          defaultType={editing.type}
          onCancel={() => setEditing(null)}
          onSave={saveEntity}
        />
      )}

      {linking && (
        <LinkPicker
          types={types}
          entities={entities}
          initialFrom={selected}
          onCancel={() => setLinking(false)}
          onCreate={createLink}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ImportButton({ onFile }) {
  return (
    <label className="button-like">
      <button onClick={(e) => e.currentTarget.nextSibling.click()}>Import .xlsx</button>
      <input
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files[0]) { onFile(e.target.files[0]); e.target.value = ''; } }}
      />
    </label>
  );
}
