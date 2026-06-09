import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface Column {
  id: string;
  table_id: string;
  name: string;
  type: "string" | "number" | "boolean";
  order_index: number;
  description: string | null;
  created_at: number;
}

export function listColumns(tableId: string): Column[] {
  return getDb()
    .prepare("SELECT * FROM columns WHERE table_id = ? ORDER BY order_index, name")
    .all(tableId) as Column[];
}

export function addColumn(data: { table_id: string; name: string; type: Column["type"]; description?: string; order_index?: number }): Column {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    "INSERT INTO columns (id, table_id, name, type, order_index, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.table_id, data.name, data.type, data.order_index ?? 0, data.description ?? null, now);
  return db.prepare("SELECT * FROM columns WHERE id = ?").get(id) as Column;
}

export function removeColumn(id: string): void {
  getDb().prepare("DELETE FROM columns WHERE id = ?").run(id);
}
