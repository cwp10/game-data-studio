import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface Table {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  order_index: number;
  created_at: number;
  updated_at: number;
}

export function listTables(projectId: string): Table[] {
  return getDb()
    .prepare("SELECT * FROM tables WHERE project_id = ? ORDER BY order_index, name")
    .all(projectId) as Table[];
}

export function getTable(id: string): Table | undefined {
  return getDb().prepare("SELECT * FROM tables WHERE id = ?").get(id) as Table | undefined;
}

export function createTable(data: { project_id: string; name: string; description?: string; order_index?: number }): Table {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    "INSERT INTO tables (id, project_id, name, description, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.project_id, data.name, data.description ?? null, data.order_index ?? 0, now, now);
  return getTable(id)!;
}

export function deleteTable(id: string): void {
  getDb().prepare("DELETE FROM tables WHERE id = ?").run(id);
}
