// Seed data — Oil & gas context. Loaded on first run so the MVP demonstrates itself.

const ENTITY_TYPES = [
  {
    key: 'value_stream',
    label: 'Value stream',
    color: '#1D9E75',
    attribute_schema: [
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'owner', label: 'Owner', type: 'text' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['H', 'M', 'L'] },
      { key: 'maturity', label: 'Maturity', type: 'text' },
    ],
  },
  {
    key: 'capability',
    label: 'Capability',
    color: '#0F6E56',
    attribute_schema: [
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'current_maturity', label: 'Current maturity (1–5)', type: 'number' },
      { key: 'target_maturity', label: 'Target maturity (1–5)', type: 'number' },
      { key: 'owner', label: 'Owner', type: 'text' },
    ],
  },
  {
    key: 'project',
    label: 'Project',
    color: '#534AB7',
    attribute_schema: [
      { key: 'status', label: 'Status', type: 'select', options: ['planned', 'in_progress', 'on_hold', 'complete', 'cancelled'] },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'sponsor', label: 'Sponsor', type: 'text' },
      { key: 'percent_complete', label: 'Percent complete', type: 'number' },
      { key: 'budget', label: 'Budget', type: 'number' },
    ],
  },
  {
    key: 'technology',
    label: 'Technology',
    color: '#185FA5',
    attribute_schema: [
      { key: 'vendor', label: 'Vendor', type: 'text' },
      { key: 'lifecycle', label: 'Lifecycle', type: 'select', options: ['emerging', 'current', 'contained', 'retiring'] },
      { key: 'hosting', label: 'Hosting', type: 'select', options: ['on-prem', 'cloud', 'OT'] },
      { key: 'owner', label: 'Owner', type: 'text' },
    ],
  },
  {
    key: 'theme',
    label: 'Theme',
    color: '#5F5E5A',
    attribute_schema: [
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'sponsor', label: 'Sponsor', type: 'text' },
    ],
  },
];

const RELATIONSHIP_TYPES = [
  { key: 'enables', label: 'enables', from_type: 'technology', to_type: 'capability', attribute_schema: null },
  { key: 'enables', label: 'enables', from_type: 'technology', to_type: 'project', attribute_schema: null },
  { key: 'realizes', label: 'realizes', from_type: 'project', to_type: 'capability', attribute_schema: null },
  { key: 'delivers', label: 'delivers', from_type: 'capability', to_type: 'value_stream', attribute_schema: null },
  { key: 'groups', label: 'groups', from_type: 'theme', to_type: 'project', attribute_schema: null },
  {
    key: 'depends_on',
    label: 'depends on',
    from_type: 'project',
    to_type: 'project',
    attribute_schema: [
      { key: 'kind', label: 'Kind', type: 'select', options: ['technical', 'organizational', 'governance', 'other'] },
    ],
  },
];

const ENTITIES = {
  value_stream: [
    { name: 'Upstream production', attributes: { owner: 'Production Ops', priority: 'H', description: 'Maximise safe, reliable hydrocarbon production.' } },
    { name: 'Drilling & completions', attributes: { owner: 'D&C', priority: 'M', description: 'Deliver wells safely, on time and on budget.' } },
    { name: 'Facilities reliability', attributes: { owner: 'Maintenance', priority: 'H', description: 'Keep plant and equipment available and safe.' } },
    { name: 'HSE assurance', attributes: { owner: 'HSE', priority: 'H', description: 'Protect people and environment; stay compliant.' } },
    { name: 'Field-data-to-decision', attributes: { owner: 'Digital', priority: 'H', description: 'Turn field telemetry into operational decisions.' } },
  ],
  capability: [
    { name: 'Predictive maintenance', attributes: { current_maturity: 2, target_maturity: 4, owner: 'Reliability Eng', description: 'Predict equipment failures before they occur.' } },
    { name: 'Well surveillance', attributes: { current_maturity: 3, target_maturity: 5, owner: 'Petroleum Eng', description: 'Continuous monitoring of well performance.' } },
    { name: 'Permit-to-work management', attributes: { current_maturity: 3, target_maturity: 4, owner: 'HSE', description: 'Control of hazardous work via permits.' } },
    { name: 'Production data integration', attributes: { current_maturity: 2, target_maturity: 4, owner: 'Digital', description: 'Unified, trusted production data layer.' } },
    { name: 'AI-assisted knowledge retrieval', attributes: { current_maturity: 1, target_maturity: 4, owner: 'Digital', description: 'Find and reason over enterprise knowledge.' } },
  ],
  project: [
    { name: 'ATDB modernization', attributes: { status: 'in_progress', start_date: '2025-01-15', end_date: '2025-09-30', sponsor: 'Digital', percent_complete: 45, budget: 1200000 } },
    { name: 'M365 Copilot enablement', attributes: { status: 'in_progress', start_date: '2025-03-01', end_date: '2025-12-15', sponsor: 'IT', percent_complete: 30, budget: 450000 } },
    { name: 'Silixa DAS/DTS install (Alpine pad)', attributes: { status: 'planned', start_date: '2025-06-01', end_date: '2025-11-30', sponsor: 'Petroleum Eng', percent_complete: 0, budget: 800000 } },
    { name: 'Sensia TMS replacement', attributes: { status: 'planned', start_date: '2025-08-01', end_date: '2026-03-31', sponsor: 'Operations', percent_complete: 0, budget: 650000 } },
    { name: 'Production historian upgrade', attributes: { status: 'in_progress', start_date: '2025-02-01', end_date: '2025-08-31', sponsor: 'Digital', percent_complete: 60, budget: 300000 } },
  ],
  technology: [
    { name: 'SCADA', attributes: { vendor: 'Various', lifecycle: 'current', hosting: 'OT', owner: 'Automation' } },
    { name: 'IP.21 historian', attributes: { vendor: 'AspenTech', lifecycle: 'current', hosting: 'on-prem', owner: 'Digital' } },
    { name: 'SAP S/4HANA', attributes: { vendor: 'SAP', lifecycle: 'current', hosting: 'cloud', owner: 'IT' } },
    { name: 'Azure', attributes: { vendor: 'Microsoft', lifecycle: 'current', hosting: 'cloud', owner: 'IT' } },
    { name: 'Microsoft 365 Copilot', attributes: { vendor: 'Microsoft', lifecycle: 'emerging', hosting: 'cloud', owner: 'IT' } },
    { name: 'Power BI', attributes: { vendor: 'Microsoft', lifecycle: 'current', hosting: 'cloud', owner: 'Digital' } },
  ],
  theme: [
    { name: 'Data modernization', attributes: { sponsor: 'Digital', description: 'Modernise data platforms and pipelines.' } },
    { name: 'AI & digital enablement', attributes: { sponsor: 'Digital', description: 'Adopt AI to augment the workforce.' } },
    { name: 'OT/IT convergence', attributes: { sponsor: 'Automation', description: 'Bridge operational and information technology.' } },
    { name: 'Operational reliability', attributes: { sponsor: 'Operations', description: 'Improve uptime and asset reliability.' } },
  ],
};

// [from_name, relationship_key, to_name, attributes]
const RELATIONSHIPS = [
  // delivers: capability -> value_stream
  ['Predictive maintenance', 'delivers', 'Facilities reliability', {}],
  ['Well surveillance', 'delivers', 'Upstream production', {}],
  ['Production data integration', 'delivers', 'Field-data-to-decision', {}],
  ['AI-assisted knowledge retrieval', 'delivers', 'Field-data-to-decision', {}],
  ['Permit-to-work management', 'delivers', 'HSE assurance', {}],

  // realizes: project -> capability
  ['ATDB modernization', 'realizes', 'Production data integration', {}],
  ['M365 Copilot enablement', 'realizes', 'AI-assisted knowledge retrieval', {}],
  ['Silixa DAS/DTS install (Alpine pad)', 'realizes', 'Well surveillance', {}],
  ['Sensia TMS replacement', 'realizes', 'Predictive maintenance', {}],
  ['Production historian upgrade', 'realizes', 'Production data integration', {}],

  // enables: technology -> capability | project
  ['Azure', 'enables', 'ATDB modernization', {}],
  ['Microsoft 365 Copilot', 'enables', 'M365 Copilot enablement', {}],
  ['Microsoft 365 Copilot', 'enables', 'AI-assisted knowledge retrieval', {}],
  ['IP.21 historian', 'enables', 'Production data integration', {}],
  ['SCADA', 'enables', 'Production data integration', {}],
  ['Power BI', 'enables', 'Well surveillance', {}],

  // groups: theme -> project
  ['Data modernization', 'groups', 'ATDB modernization', {}],
  ['Data modernization', 'groups', 'Production historian upgrade', {}],
  ['AI & digital enablement', 'groups', 'M365 Copilot enablement', {}],
  ['OT/IT convergence', 'groups', 'Silixa DAS/DTS install (Alpine pad)', {}],
  ['OT/IT convergence', 'groups', 'Sensia TMS replacement', {}],
  ['Operational reliability', 'groups', 'Sensia TMS replacement', {}],

  // depends_on: project -> project (with kind)
  ['M365 Copilot enablement', 'depends_on', 'ATDB modernization', { kind: 'technical' }],
  ['Production historian upgrade', 'depends_on', 'ATDB modernization', { kind: 'technical' }],
  ['Sensia TMS replacement', 'depends_on', 'Production historian upgrade', { kind: 'organizational' }],
];

export function seed(db) {
  const insertType = db.prepare(
    'INSERT INTO entity_types (key, label, color, attribute_schema) VALUES (?, ?, ?, ?)'
  );
  const insertRelType = db.prepare(
    'INSERT INTO relationship_types (key, label, from_type, to_type, attribute_schema) VALUES (?, ?, ?, ?, ?)'
  );
  const insertEntity = db.prepare(
    'INSERT INTO entities (type, name, attributes) VALUES (?, ?, ?)'
  );
  const insertRel = db.prepare(
    'INSERT INTO relationships (type, from_id, to_id, attributes) VALUES (?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    for (const t of ENTITY_TYPES) {
      insertType.run(t.key, t.label, t.color, JSON.stringify(t.attribute_schema));
    }
    for (const r of RELATIONSHIP_TYPES) {
      insertRelType.run(r.key, r.label, r.from_type, r.to_type, r.attribute_schema ? JSON.stringify(r.attribute_schema) : null);
    }

    const idByName = new Map();
    for (const [type, list] of Object.entries(ENTITIES)) {
      for (const e of list) {
        const info = insertEntity.run(type, e.name, JSON.stringify(e.attributes || {}));
        idByName.set(e.name, info.lastInsertRowid);
      }
    }

    for (const [fromName, key, toName, attrs] of RELATIONSHIPS) {
      const fromId = idByName.get(fromName);
      const toId = idByName.get(toName);
      if (!fromId || !toId) throw new Error(`Seed relationship references unknown entity: ${fromName} -> ${toName}`);
      insertRel.run(key, fromId, toId, JSON.stringify(attrs || {}));
    }
  });

  tx();
}
