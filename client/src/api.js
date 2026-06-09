// Thin REST client mirroring the API contract.

async function req(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    let detail;
    try { detail = await res.json(); } catch { detail = { error: res.statusText }; }
    const err = new Error(detail.error || 'Request failed');
    err.details = detail.details;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getTypes: () => req('GET', '/api/types'),

  listEntities: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.q) qs.set('q', params.q);
    const s = qs.toString();
    return req('GET', `/api/entities${s ? `?${s}` : ''}`);
  },
  createEntity: (e) => req('POST', '/api/entities', e),
  updateEntity: (id, e) => req('PUT', `/api/entities/${id}`, e),
  deleteEntity: (id) => req('DELETE', `/api/entities/${id}`),

  listRelationships: () => req('GET', '/api/relationships'),
  createRelationship: (r) => req('POST', '/api/relationships', r),
  deleteRelationship: (id) => req('DELETE', `/api/relationships/${id}`),

  impact: (id, direction = 'out', depth = 0) =>
    req('GET', `/api/entities/${id}/impact?direction=${direction}&depth=${depth}`),

  // Excel
  exportUrl: '/api/export',
  importFile: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/import', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    return data;
  },
};
