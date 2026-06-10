import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface Annotation {
  id: string;
  project_id: string;
  table_id: string;
  row_id: string | null;
  column_name: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

// 기존 DB에도 안전하게 적용되도록 최초 사용 시 테이블을 보장한다(자가 부트스트랩).
let ensured = false;
function ensure(): void {
  if (ensured) return;
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS annotations (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL,
      table_id    TEXT NOT NULL,
      row_id      TEXT,
      column_name TEXT,
      note        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_annotations_table ON annotations(table_id);
    CREATE INDEX IF NOT EXISTS idx_annotations_row ON annotations(table_id, row_id);
  `);
  ensured = true;
}

export function listAnnotations(tableId: string): Annotation[] {
  ensure();
  return getDb()
    .prepare("SELECT * FROM annotations WHERE table_id = ? ORDER BY created_at")
    .all(tableId) as Annotation[];
}

export function listRowAnnotations(tableId: string, rowId: string): Annotation[] {
  ensure();
  return getDb()
    .prepare("SELECT * FROM annotations WHERE table_id = ? AND row_id = ? ORDER BY created_at")
    .all(tableId, rowId) as Annotation[];
}

export function upsertAnnotation(
  id: string | null,
  fields: {
    project_id: string;
    table_id: string;
    row_id?: string | null;
    column_name?: string | null;
    note: string;
  }
): Annotation {
  ensure();
  const db = getDb();
  const annId = id ?? newId();
  db.prepare(
    `INSERT INTO annotations (id, project_id, table_id, row_id, column_name, note)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       project_id = excluded.project_id,
       table_id = excluded.table_id,
       row_id = excluded.row_id,
       column_name = excluded.column_name,
       note = excluded.note,
       updated_at = datetime('now')`
  ).run(
    annId,
    fields.project_id,
    fields.table_id,
    fields.row_id ?? null,
    fields.column_name ?? null,
    fields.note
  );
  return db.prepare("SELECT * FROM annotations WHERE id = ?").get(annId) as Annotation;
}

export function deleteAnnotation(id: string): void {
  ensure();
  getDb().prepare("DELETE FROM annotations WHERE id = ?").run(id);
}
