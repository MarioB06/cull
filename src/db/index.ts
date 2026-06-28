import * as SQLite from 'expo-sqlite';

export type Decision = 'kept' | 'queued' | 'deleted';

export interface DecisionRow {
  asset_id: string;
  decision: Decision;
  decided_at: number;
  file_size: number | null;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Singleton-DB-Handle. Initialisiert Schema beim ersten Zugriff. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndInit();
  }
  return dbPromise;
}

async function openAndInit(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('cull.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS decisions (
      asset_id TEXT PRIMARY KEY NOT NULL,
      decision TEXT NOT NULL,
      decided_at INTEGER NOT NULL,
      file_size INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_decisions_decision ON decisions(decision);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  return db;
}
