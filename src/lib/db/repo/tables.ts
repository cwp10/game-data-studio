import { getDb } from "../client";
import { newId } from "../../util/ids";
import { addColumn } from "./columns";

export interface Table {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  order_index: number;
  created_at: number;
  updated_at: number;
}

export function listTables(projectId: string): (Table & { row_count: number })[] {
  return getDb()
    .prepare(`SELECT t.*, COUNT(r.id) as row_count
              FROM tables t LEFT JOIN rows r ON r.table_id = t.id
              WHERE t.project_id = ? GROUP BY t.id ORDER BY t.order_index, t.name`)
    .all(projectId) as (Table & { row_count: number })[];
}

export function getTable(id: string): Table | undefined {
  return getDb().prepare("SELECT * FROM tables WHERE id = ?").get(id) as Table | undefined;
}

export function createTable(data: { project_id: string; name: string; description?: string; order_index?: number }): Table {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  // 테이블 행 + 기본 id 컬럼을 한 트랜잭션으로 — addColumn 이 실패하면 테이블도 롤백되어
  // "컬럼 없는 테이블"이 남지 않는다.
  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO tables (id, project_id, name, description, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, data.project_id, data.name, data.description ?? null, data.order_index ?? 0, now, now);
    // 모든 테이블은 고유 id 컬럼(PK)을 기본으로 가진다. 행 생성 시 유니크 값이 자동 부여됨.
    addColumn({ table_id: id, name: "id", type: "string", description: "고유 식별자", order_index: 0 });
  });
  tx();
  return getTable(id)!;
}

export function deleteTable(id: string): void {
  getDb().prepare("DELETE FROM tables WHERE id = ?").run(id);
}

export function updateTable(id: string, data: { name?: string; description?: string }): Table {
  const db = getDb();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); vals.push(data.name); }
  if (data.description !== undefined) { sets.push("description = ?"); vals.push(data.description); }
  if (!sets.length) return getTable(id)!;
  sets.push("updated_at = ?"); vals.push(Date.now());
  vals.push(id);
  db.prepare(`UPDATE tables SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return getTable(id)!;
}
