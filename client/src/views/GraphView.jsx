import { useEffect, useMemo, useRef } from 'react';
import cytoscape from 'cytoscape';

// Hero view: typed nodes coloured by type, sized by fan-out count, edges
// labelled by relationship. Click a node → select it (opens the inspect panel).
export default function GraphView({ types, entities, relationships, colorOf, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const relLabel = useMemo(() => {
    const m = {};
    types.relationship_types.forEach((rt) => { m[rt.key] = rt.label; });
    return m;
  }, [types]);

  // Transitive fan-out count per node (how many things it ultimately reaches).
  const fanOut = useMemo(() => computeFanOut(entities, relationships), [entities, relationships]);

  const elements = useMemo(() => {
    const ids = new Set(entities.map((e) => e.id));
    const nodes = entities.map((e) => ({
      data: { id: `n${e.id}`, raw: e.id, label: e.name, type: e.type, fan: fanOut.get(e.id) || 0 },
    }));
    const edges = relationships
      .filter((r) => ids.has(r.from_id) && ids.has(r.to_id))
      .map((r) => ({
        data: {
          id: `e${r.id}`,
          source: `n${r.from_id}`,
          target: `n${r.to_id}`,
          label: relLabel[r.type] || r.type,
          rel: r.type,
        },
      }));
    return [...nodes, ...edges];
  }, [entities, relationships, fanOut, relLabel]);

  // Build the graph once.
  useEffect(() => {
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => colorOf[ele.data('type')] || '#888',
            label: 'data(label)',
            color: '#1d2433',
            'font-size': 11,
            'text-wrap': 'wrap',
            'text-max-width': 110,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            width: (ele) => 26 + Math.min(34, (ele.data('fan') || 0) * 6),
            height: (ele) => 26 + Math.min(34, (ele.data('fan') || 0) * 6),
            'border-width': 0,
          },
        },
        {
          selector: 'node:selected',
          style: { 'border-width': 4, 'border-color': '#534ab7', 'border-opacity': 0.5 },
        },
        {
          selector: 'edge',
          style: {
            width: 1.6,
            'line-color': '#c5c9d3',
            'target-arrow-color': '#c5c9d3',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.9,
            label: 'data(label)',
            'font-size': 9,
            color: '#98a2b3',
            'text-rotation': 'autorotate',
            'text-background-color': '#f7f8fa',
            'text-background-opacity': 1,
            'text-background-padding': 2,
          },
        },
        { selector: 'edge[rel = "depends_on"]', style: { 'line-style': 'dashed', 'line-color': '#b42318', 'target-arrow-color': '#b42318' } },
        { selector: '.faded', style: { opacity: 0.15 } },
        { selector: '.hl', style: { opacity: 1 } },
      ],
      layout: layoutOpts(),
      wheelSensitivity: 0.2,
    });

    cy.on('tap', 'node', (evt) => onSelectRef.current(evt.target.data('raw')));
    cy.on('tap', (evt) => { if (evt.target === cy) onSelectRef.current(null); });

    cyRef.current = cy;
    return () => cy.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update elements when data changes.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.json({ elements });
    cy.layout(layoutOpts()).run();
  }, [elements]);

  // Reflect selection + highlight neighbourhood.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('faded hl').unselect();
    if (selectedId != null) {
      const node = cy.getElementById(`n${selectedId}`);
      if (node.nonempty()) {
        node.select();
        const hood = node.closedNeighborhood();
        cy.elements().addClass('faded');
        hood.removeClass('faded').addClass('hl');
      }
    }
  }, [selectedId, elements]);

  return (
    <>
      <Legend types={types} />
      <div className="graph-canvas" ref={containerRef} />
    </>
  );
}

function layoutOpts() {
  return { name: 'cose', animate: false, padding: 40, nodeRepulsion: 9000, idealEdgeLength: 110, gravity: 0.4 };
}

function computeFanOut(entities, relationships) {
  const adj = new Map();
  for (const e of entities) adj.set(e.id, []);
  for (const r of relationships) if (adj.has(r.from_id)) adj.get(r.from_id).push(r.to_id);
  const counts = new Map();
  for (const e of entities) {
    const seen = new Set();
    const stack = [...(adj.get(e.id) || [])];
    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      for (const n of adj.get(id) || []) if (!seen.has(n)) stack.push(n);
    }
    counts.set(e.id, seen.size);
  }
  return counts;
}

function Legend({ types }) {
  return (
    <div className="legend">
      {types.entity_types.map((t) => (
        <span key={t.key}><span className="swatch" style={{ background: t.color }} /> {t.label}</span>
      ))}
      <span style={{ marginLeft: 'auto' }}>Node size = fan-out · dashed red = depends on</span>
    </div>
  );
}
