import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.PLANNER_DB || path.join(__dirname, '..', 'planner.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema migrations (idempotent — CREATE TABLE IF NOT EXISTS).
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Seed on first launch so the app is populated and looks real.
const seeded = db.prepare('SELECT COUNT(*) AS n FROM entity_types').get().n > 0;
if (!seeded) {
  seed(db);
  console.log('[db] seeded fresh database at', DB_PATH);
}

export default db;
