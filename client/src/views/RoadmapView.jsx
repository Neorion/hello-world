import { useEffect, useMemo, useRef, useState } from 'react';
import { Timeline } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data';
import 'vis-timeline/styles/vis-timeline-graph2d.css';

// Projects on a date axis, grouped into swim-lanes by Theme or by the Value
// stream they ultimately deliver. depends_on relationships are surfaced on each
// item's tooltip.
export default function RoadmapView({ entities, relationships, themes, colorOf, onSelect }) {
  const containerRef = useRef(null);
  const tlRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [groupBy, setGroupBy] = useState('theme'); // 'theme' | 'value_stream'

  const projects = useMemo(() => entities.filter((e) => e.type === 'project'), [entities]);
  const byId = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);

  const { items, groups } = useMemo(
    () => buildTimeline(projects, entities, relationships, byId, colorOf, groupBy),
    [projects, entities, relationships, byId, colorOf, groupBy]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const tl = new Timeline(containerRef.current, new DataSet(items), new DataSet(groups), {
      stack: true,
      orientation: 'top',
      margin: { item: 8, axis: 12 },
      zoomable: true,
      tooltip: { followMouse: true },
    });
    tl.on('select', (props) => {
      if (props.items?.length) {
        const pid = Number(String(props.items[0]).replace('p', ''));
        onSelectRef.current(pid);
      }
    });
    tlRef.current = tl;
    return () => tl.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    tl.setGroups(new DataSet(groups));
    tl.setItems(new DataSet(items));
    if (items.length) tl.fit({ animation: false });
  }, [items, groups]);

  return (
    <>
      <div className="view-toolbar">
        <span className="muted small">Swim-lanes by</span>
        <select style={{ width: 'auto' }} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
          <option value="theme">Theme</option>
          <option value="value_stream">Value stream delivered</option>
        </select>
        <span className="spacer" />
        <span className="muted small">Click a project to inspect · drag to pan · scroll to zoom</span>
      </div>
      {projects.length === 0 ? (
        <div className="empty">No projects with dates to show.</div>
      ) : (
        <div className="roadmap-canvas"><div ref={containerRef} /></div>
      )}
    </>
  );
}

function buildTimeline(projects, entities, relationships, byId, colorOf, groupBy) {
  const projColor = colorOf.project || '#534AB7';

  // Map each project to its grouping lane(s).
  const groupName = new Map(); // groupId -> label
  const projGroup = new Map(); // projectId -> groupId

  const dependsOn = (pid) =>
    relationships
      .filter((r) => r.type === 'depends_on' && r.from_id === pid)
      .map((r) => ({ name: byId.get(r.to_id)?.name, kind: r.attributes.kind }));

  for (const p of projects) {
    let lane = null;
    if (groupBy === 'theme') {
      const rel = relationships.find((r) => r.type === 'groups' && r.to_id === p.id);
      const theme = rel ? byId.get(rel.from_id) : null;
      lane = theme ? { id: `g${theme.id}`, label: theme.name } : null;
    } else {
      // project -> realizes -> capability -> delivers -> value_stream
      const realizes = relationships.filter((r) => r.type === 'realizes' && r.from_id === p.id);
      let vs = null;
      for (const r of realizes) {
        const del = relationships.find((d) => d.type === 'delivers' && d.from_id === r.to_id);
        if (del) { vs = byId.get(del.to_id); break; }
      }
      lane = vs ? { id: `g${vs.id}`, label: vs.name } : null;
    }
    if (!lane) lane = { id: 'g_none', label: 'Ungrouped' };
    groupName.set(lane.id, lane.label);
    projGroup.set(p.id, lane.id);
  }

  const groups = [...groupName.entries()].map(([id, content]) => ({ id, content }));

  const items = projects
    .map((p) => {
      const a = p.attributes || {};
      const start = a.start_date;
      const end = a.end_date;
      if (!start) return null;
      const deps = dependsOn(p.id);
      const depText = deps.length ? `<br/>depends on: ${deps.map((d) => `${d.name}${d.kind ? ` (${d.kind})` : ''}`).join(', ')}` : '';
      return {
        id: `p${p.id}`,
        group: projGroup.get(p.id),
        content: `${p.name}${a.percent_complete != null ? ` · ${a.percent_complete}%` : ''}`,
        start,
        end: end || undefined,
        type: end ? 'range' : 'point',
        style: `background-color:${projColor}; border-color:${projColor};`,
        title: `${p.name}<br/>status: ${a.status || '—'}<br/>${start} → ${end || '—'}${depText}`,
      };
    })
    .filter(Boolean);

  return { items, groups };
}
