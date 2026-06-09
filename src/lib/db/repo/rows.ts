import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface Row {
  id: string;
  table_id: string;
  data: string; // JSON
  order_index: number;
  created_at: number;
  updated_at: number;
}

export interface RowWithData extends Omit<Row, "data"> {
  data: Record<string, unknown>;
}

function parse(row: Row): RowWithData {
  return { ...row, data: JSON.parse(row.data) };
}

export interface ReadRowsOptions {
  limit?: number;
  offset?: number;
}

export function readRows(tableId: string, opts: ReadRowsOptions = {}): RowWithData[] {
  const limit = opts.limit ?? 1000;
  const offset = opts.offset ?? 0;
  const rows = getDb()
    .prepare("SELECT * FROM rows WHERE table_id = ? ORDER BY order_index, created_at LIMIT ? OFFSET ?")
    .all(tableId, limit, offset) as Row[];
  return rows.map(parse);
}

export function getRow(id: string): RowWithData | undefined {
  const row = getDb().prepare("SELECT * FROM rows WHERE id = ?").get(id) as Row | undefined;
  return row ? parse(row) : undefined;
}

export function upsertRow(tableId: string, id: string | undefined, data: Record<string, unknown>): RowWithData {
  const db = getDb();
  const now = Date.now();
  const rowId = id ?? newId();
  const existing = id ? db.prepare("SELECT id FROM rows WHERE id = ?").get(id) : null;

  if (existing) {
    db.prepare("UPDATE rows SET data = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(data), now, rowId);
  } else {
    const maxIdx = (db.prepare("SELECT MAX(order_index) as m FROM rows WHERE table_id = ?").get(tableId) as { m: number | null }).m ?? -1;
    db.prepare(
      "INSERT INTO rows (id, table_id, data, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(rowId, tableId, JSON.stringify(data), maxIdx + 1, now, now);
  }
  return getRow(rowId)!;
}

export function deleteRow(id: string): void {
  getDb().prepare("DELETE FROM rows WHERE id = ?").run(id);
}
