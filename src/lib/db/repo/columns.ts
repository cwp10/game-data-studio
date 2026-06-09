import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface Column {
  id: string;
  table_id: string;
  name: string;
  type: "string" | "number" | "boolean" | "enum";
  order_index: number;
  description: string | null;
  enum_type_id: string | null; // type='enum' 일 때 enum_types.id 참조
  created_at: number;
}

// 기존 DB 호환: enum_type_id 컬럼이 없고 type CHECK 제약이 걸린 구버전이면
// columns 테이블을 재생성(CHECK 제거 + enum_type_id 추가)한다.
let ensured = false;
function ensure() {
  if (ensured) return;
  const db = getDb();
  const info = db.prepare("PRAGMA table_info(columns)").all() as { name: string }[];
  if (info.length && !info.some((c) => c.name === "enum_type_id")) {
    const migrate = db.transaction(() => {
      db.exec(`CREATE TABLE columns_new (
        id           TEXT PRIMARY KEY,
        table_id     TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
        name         TEXT NOT NULL,
        type         TEXT NOT NULL,
        order_index  INTEGER NOT NULL DEFAULT 0,
        description  TEXT,
        enum_type_id TEXT,
        created_at   INTEGER NOT NULL
      )`);
      db.exec(`INSERT INTO columns_new (id, table_id, name, type, order_index, description, enum_type_id, created_at)
               SELECT id, table_id, name, type, order_index, description, NULL, created_at FROM columns`);
      db.exec("DROP TABLE columns");
      db.exec("ALTER TABLE columns_new RENAME TO columns");
      db.exec("CREATE INDEX IF NOT EXISTS idx_columns_table ON columns(table_id, order_index)");
    });
    migrate();
  }
  ensured = true;
}

export function listColumns(tableId: string): Column[] {
  ensure();
  return getDb()
    .prepare("SELECT * FROM columns WHERE table_id = ? ORDER BY order_index, name")
    .all(tableId) as Column[];
}

export function addColumn(data: {
  table_id: string;
  name: string;
  type: Column["type"];
  description?: string;
  order_index?: number;
  enum_type_id?: string | null;
}): Column {
  ensure();
  const db = getDb();
  // 같은 테이블 내 컬럼명 중복 방지 (헤드리스 AI가 같은 컬럼을 중복 생성하는 문제 차단)
  const dup = db.prepare("SELECT id FROM columns WHERE table_id = ? AND name = ?").get(data.table_id, data.name);
  if (dup) throw new Error(`이미 '${data.name}' 컬럼이 존재합니다.`);
  const id = newId();
  const now = Date.now();
  db.prepare(
    "INSERT INTO columns (id, table_id, name, type, order_index, description, enum_type_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.table_id, data.name, data.type, data.order_index ?? 0, data.description ?? null, data.enum_type_id ?? null, now);
  return db.prepare("SELECT * FROM columns WHERE id = ?").get(id) as Column;
}

// enum 타입을 참조하는 컬럼 수 (삭제 가드용)
export function countColumnsUsingEnum(enumTypeId: string): number {
  ensure();
  return (getDb().prepare("SELECT COUNT(*) as n FROM columns WHERE enum_type_id = ?").get(enumTypeId) as { n: number }).n;
}

export function removeColumn(id: string): void {
  getDb().prepare("DELETE FROM columns WHERE id = ?").run(id);
}
