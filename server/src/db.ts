import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'logbook.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    vehicleId TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('HANDOVER', 'TRIP_START', 'TRIP_END', 'CORRECTION')),
    createdAt TEXT NOT NULL,
    driverId TEXT NOT NULL,
    payload TEXT NOT NULL,
    prevHash TEXT,
    hash TEXT NOT NULL,
    receivedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_events_vehicle ON events(vehicleId, createdAt);
  CREATE INDEX IF NOT EXISTS idx_events_hash ON events(hash);

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    vehicleId TEXT NOT NULL,
    filename TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    uploadedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;

// ── Query helpers ──

export function getVehicleEvents(vehicleId: string) {
  return db
    .prepare('SELECT * FROM events WHERE vehicleId = ? ORDER BY createdAt ASC')
    .all(vehicleId) as ServerEvent[];
}

export function getLastHash(vehicleId: string): string | null {
  const row = db
    .prepare('SELECT hash FROM events WHERE vehicleId = ? ORDER BY createdAt DESC LIMIT 1')
    .get(vehicleId) as { hash: string } | undefined;
  return row?.hash ?? null;
}

export function insertEvent(event: ServerEvent): void {
  db.prepare(`
    INSERT INTO events (id, vehicleId, type, createdAt, driverId, payload, prevHash, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.id,
    event.vehicleId,
    event.type,
    event.createdAt,
    event.driverId,
    typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload),
    event.prevHash,
    event.hash,
  );
}

export function insertPhoto(photo: { id: string; vehicleId: string; filename: string; mimeType: string; sha256: string }): void {
  db.prepare(`
    INSERT INTO photos (id, vehicleId, filename, mimeType, sha256)
    VALUES (?, ?, ?, ?, ?)
  `).run(photo.id, photo.vehicleId, photo.filename, photo.mimeType, photo.sha256);
}

export interface ServerEvent {
  id: string;
  vehicleId: string;
  type: string;
  createdAt: string;
  driverId: string;
  payload: string | Record<string, unknown>;
  prevHash: string | null;
  hash: string;
  receivedAt?: string;
}
