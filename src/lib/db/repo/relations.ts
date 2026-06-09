import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface Relation {
  id: string;
  project_id: string;
  from_table_id: string;
  from_column: string;
  to_table_id: string;
  to_column: string;
  created_at: number;
}

export function listRelations(projectId: string): Relation[] {
  return getDb()
    .prepare("SELECT * FROM relations WHERE project_id = ? ORDER BY created_at")
    .all(projectId) as Relation[];
}

export function setRelation(data: Omit<Relation, "id" | "created_at">): Relation {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    "INSERT INTO relations (id, project_id, from_table_id, from_column, to_table_id, to_column, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.project_id, data.from_table_id, data.from_column, data.to_table_id, data.to_column, now);
  return db.prepare("SELECT * FROM relations WHERE id = ?").get(id) as Relation;
}

export function deleteRelation(id: string): void {
  getDb().prepare("DELETE FROM relations WHERE id = ?").run(id);
}
