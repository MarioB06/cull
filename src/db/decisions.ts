import { getDb, type Decision, type DecisionRow } from './index';

/** Eine Entscheidung setzen/aktualisieren (upsert). */
export async function setDecision(
  assetId: string,
  decision: Decision,
  fileSize: number | null = null,
  decidedAt: number = Date.now(),
): Promise<void> {
  const db = await getDb();
  // file_size nur überschreiben, wenn ein neuer Wert vorliegt (sonst gecachten behalten).
  await db.runAsync(
    `INSERT INTO decisions (asset_id, decision, decided_at, file_size)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(asset_id) DO UPDATE SET
       decision = excluded.decision,
       decided_at = excluded.decided_at,
       file_size = COALESCE(excluded.file_size, decisions.file_size)`,
    [assetId, decision, decidedAt, fileSize],
  );
}

/** Gecachte Dateigröße eines Assets aktualisieren, ohne die Entscheidung zu ändern. */
export async function updateFileSize(assetId: string, fileSize: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE decisions SET file_size = ? WHERE asset_id = ?`, [fileSize, assetId]);
}

/** Eine Entscheidung komplett entfernen → Asset gilt wieder als "unentschieden" (für Undo). */
export async function clearDecision(assetId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM decisions WHERE asset_id = ?`, [assetId]);
}

/** Alle Entscheidungs-IDs (kept|queued|deleted) als Set — zum Herausfiltern beim Pool-Auffüllen. */
export async function getDecidedIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ asset_id: string }>(`SELECT asset_id FROM decisions`);
  return new Set(rows.map((r) => r.asset_id));
}

/** Anzahl aller Entscheidungen (= processed). */
export async function countDecisions(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM decisions`);
  return row?.c ?? 0;
}

/** Zähler nach Decision-Typ. */
export async function countByDecision(): Promise<Record<Decision, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ decision: Decision; c: number }>(
    `SELECT decision, COUNT(*) AS c FROM decisions GROUP BY decision`,
  );
  const out: Record<Decision, number> = { kept: 0, queued: 0, deleted: 0 };
  for (const r of rows) out[r.decision] = r.c;
  return out;
}

/** Alle Zeilen in der Queue (decision='queued'), neueste Entscheidung zuerst. */
export async function getQueue(): Promise<DecisionRow[]> {
  const db = await getDb();
  return db.getAllAsync<DecisionRow>(
    `SELECT asset_id, decision, decided_at, file_size
     FROM decisions WHERE decision = 'queued'
     ORDER BY decided_at DESC`,
  );
}

/** Alle queued Asset-IDs. */
export async function getQueuedIds(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ asset_id: string }>(
    `SELECT asset_id FROM decisions WHERE decision = 'queued'`,
  );
  return rows.map((r) => r.asset_id);
}

/** Mehrere Assets auf 'deleted' setzen (nach erfolgreichem System-Löschen). */
export async function markDeleted(assetIds: string[]): Promise<void> {
  if (assetIds.length === 0) return;
  const db = await getDb();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const id of assetIds) {
      await db.runAsync(
        `UPDATE decisions SET decision = 'deleted', decided_at = ? WHERE asset_id = ?`,
        [now, id],
      );
    }
  });
}

/** Lebenslange Anzahl endgültig gelöschter Fotos (für das Free-Limit). */
export async function countDeletedLifetime(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM decisions WHERE decision = 'deleted'`,
  );
  return row?.c ?? 0;
}

/** Summe der freigegebenen Bytes über alle jemals gelöschten Fotos (für die Statistik). */
export async function sumFreedBytesLifetime(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ s: number | null }>(
    `SELECT SUM(file_size) AS s FROM decisions WHERE decision = 'deleted' AND file_size IS NOT NULL`,
  );
  return row?.s ?? 0;
}

/** Alle Entscheidungen löschen (Verlauf zurücksetzen). */
export async function resetAllDecisions(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM decisions`);
}
