import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface Snapshot {
  id: string;
  table_id: string;
  name: string;
  data: string; // JSON array of rows
  created_at: number;
}

export function listSnapshots(tableId: string): Snapshot[] {
  return getDb().prepare("SELECT * FROM snapshots WHERE table_id = ? ORDER BY created_at DESC").all(tableId) as Snapshot[];
}

export function createSnapshot(tableId: string, name: string, data: unknown[]): Snapshot {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  db.prepare("INSERT INTO snapshots (id, table_id, name, data, created_at) VALUES (?, ?, ?, ?, ?)").run(id, tableId, name, JSON.stringify(data), now);
  return db.prepare("SELECT * FROM snapshots WHERE id = ?").get(id) as Snapshot;
}

export function deleteSnapshot(id: string): void {
  getDb().prepare("DELETE FROM snapshots WHERE id = ?").run(id);
}
