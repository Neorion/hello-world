// Breadth-first impact traversal over the relationships graph.
// direction 'out' = fan-out ("how many things does this enable?")
// direction 'in'  = fan-in  ("what must happen to deliver this?")

export function traverse(db, rootId, direction = 'out', maxDepth = 0) {
  const root = db.prepare('SELECT * FROM entities WHERE id = ?').get(rootId);
  if (!root) return null;

  const outStmt = db.prepare('SELECT * FROM relationships WHERE from_id = ?');
  const inStmt = db.prepare('SELECT * FROM relationships WHERE to_id = ?');
  const entityStmt = db.prepare('SELECT * FROM entities WHERE id = ?');

  const visited = new Map(); // id -> entity (parsed)
  const edges = [];
  const seenEdge = new Set();

  const parseEntity = (e) => ({ ...e, attributes: JSON.parse(e.attributes) });
  visited.set(root.id, parseEntity(root));

  // depth 0 means unlimited.
  const limit = maxDepth && maxDepth > 0 ? maxDepth : Infinity;
  let frontier = [root.id];
  let depth = 0;

  while (frontier.length && depth < limit) {
    const next = [];
    for (const id of frontier) {
      const rels = direction === 'in' ? inStmt.all(id) : outStmt.all(id);
      for (const r of rels) {
        const neighborId = direction === 'in' ? r.from_id : r.to_id;
        if (!seenEdge.has(r.id)) {
          seenEdge.add(r.id);
          edges.push({ ...r, attributes: JSON.parse(r.attributes) });
        }
        if (!visited.has(neighborId)) {
          const e = entityStmt.get(neighborId);
          if (e) {
            visited.set(neighborId, parseEntity(e));
            next.push(neighborId);
          }
        }
      }
    }
    frontier = next;
    depth += 1;
  }

  const nodes = [...visited.values()];
  return {
    root: visited.get(root.id),
    direction,
    nodes,
    edges,
    count: nodes.length - 1, // reachable entities, excluding the root
  };
}
