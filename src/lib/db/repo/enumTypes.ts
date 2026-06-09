import { getDb } from "../client";
import { newId } from "../../util/ids";

// 프로젝트 단위 재사용 enum 타입 (예: Grade=[SSR,SR,R,N], Element=[fire,ice,...])
export interface EnumType {
  id: string;
  project_id: string;
  name: string;
  values: string[];
  created_at: number;
  updated_at: number;
}

interface EnumTypeRow {
  id: string;
  project_id: string;
  name: string;
  allowed_values: string; // JSON
  created_at: number;
  updated_at: number;
}

let ensured = false;
function ensure() {
  if (ensured) return;
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS enum_types (
      id             TEXT PRIMARY KEY,
      project_id     TEXT NOT NULL,
      name           TEXT NOT NULL,
      allowed_values TEXT NOT NULL,
      created_at     INTEGER NOT NULL,
      updated_at     INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_enum_types_project ON enum_types(project_id);
  `);
  ensured = true;
}

const parse = (r: EnumTypeRow): EnumType => ({
  id: r.id, project_id: r.project_id, name: r.name,
  values: JSON.parse(r.allowed_values), created_at: r.created_at, updated_at: r.updated_at,
});

export function listEnumTypes(projectId: string): EnumType[] {
  ensure();
  return (getDb().prepare("SELECT * FROM enum_types WHERE project_id = ? ORDER BY name").all(projectId) as EnumTypeRow[]).map(parse);
}

export function getEnumType(id: string): EnumType | undefined {
  ensure();
  const r = getDb().prepare("SELECT * FROM enum_types WHERE id = ?").get(id) as EnumTypeRow | undefined;
  return r ? parse(r) : undefined;
}

export function createEnumType(d: { project_id: string; name: string; values: string[] }): EnumType {
  ensure();
  const db = getDb();
  const dup = db.prepare("SELECT id FROM enum_types WHERE project_id = ? AND name = ?").get(d.project_id, d.name);
  if (dup) throw new Error(`이미 '${d.name}' 타입이 존재합니다.`);
  const id = newId();
  const now = Date.now();
  db.prepare("INSERT INTO enum_types (id, project_id, name, allowed_values, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, d.project_id, d.name, JSON.stringify(d.values), now, now);
  return getEnumType(id)!;
}

export function updateEnumType(id: string, d: { name?: string; values?: string[] }): EnumType {
  ensure();
  const cur = getEnumType(id);
  if (!cur) throw new Error("enum type not found");
  const name = d.name ?? cur.name;
  const values = d.values ?? cur.values;
  getDb().prepare("UPDATE enum_types SET name = ?, allowed_values = ?, updated_at = ? WHERE id = ?")
    .run(name, JSON.stringify(values), Date.now(), id);
  return getEnumType(id)!;
}

export function deleteEnumType(id: string): void {
  ensure();
  getDb().prepare("DELETE FROM enum_types WHERE id = ?").run(id);
}
