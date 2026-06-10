import { getDb } from "../client";
import { newId } from "../../util/ids";
import type { ColumnConstraint } from "../../validation";

export interface Column {
  id: string;
  table_id: string;
  name: string;
  type: "string" | "number" | "boolean" | "enum";
  order_index: number;
  description: string | null;
  enum_type_id: string | null; // type='enum' 일 때 enum_types.id 참조
  constraints: ColumnConstraint | null; // min/max/required/unique. NULL=제약 없음
  created_at: number;
}

// DB의 원본 행 형태(constraints가 JSON 문자열). SELECT 결과 캐스팅용.
type ColumnRow = Omit<Column, "constraints"> & { constraints: string | null };

// 원본 행 → Column. constraints JSON 파싱(없으면 null).
function parseColumn(row: ColumnRow): Column {
  return { ...row, constraints: row.constraints ? (JSON.parse(row.constraints) as ColumnConstraint) : null };
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
  // additive: constraints 컬럼이 없으면 추가(ALTER ADD only — 재생성 금지, 실데이터 보존).
  // 위 enum_type_id 재생성 후에는 info가 stale 하므로 다시 조회한다.
  const info2 = db.prepare("PRAGMA table_info(columns)").all() as { name: string }[];
  if (info2.length && !info2.some((c) => c.name === "constraints")) {
    db.exec("ALTER TABLE columns ADD COLUMN constraints TEXT");
  }
  ensured = true;
}

export function listColumns(tableId: string): Column[] {
  ensure();
  return (getDb()
    .prepare("SELECT * FROM columns WHERE table_id = ? ORDER BY order_index, name")
    .all(tableId) as ColumnRow[]).map(parseColumn);
}

export function addColumn(data: {
  table_id: string;
  name: string;
  type: Column["type"];
  description?: string;
  order_index?: number;
  enum_type_id?: string | null;
  constraints?: ColumnConstraint | null;
}): Column {
  ensure();
  const db = getDb();
  // 같은 테이블 내 컬럼명 중복 방지 (헤드리스 AI가 같은 컬럼을 중복 생성하는 문제 차단)
  const dup = db.prepare("SELECT id FROM columns WHERE table_id = ? AND name = ?").get(data.table_id, data.name);
  if (dup) throw new Error(`이미 '${data.name}' 컬럼이 존재합니다.`);
  const id = newId();
  const now = Date.now();
  const constraintsJson = data.constraints != null ? JSON.stringify(data.constraints) : null;
  db.prepare(
    "INSERT INTO columns (id, table_id, name, type, order_index, description, enum_type_id, constraints, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.table_id, data.name, data.type, data.order_index ?? 0, data.description ?? null, data.enum_type_id ?? null, constraintsJson, now);
  return parseColumn(db.prepare("SELECT * FROM columns WHERE id = ?").get(id) as ColumnRow);
}

// enum 타입을 참조하는 컬럼 수 (삭제 가드용)
export function countColumnsUsingEnum(enumTypeId: string): number {
  ensure();
  return (getDb().prepare("SELECT COUNT(*) as n FROM columns WHERE enum_type_id = ?").get(enumTypeId) as { n: number }).n;
}

// 컬럼 메타 수정. 이름 변경 시 해당 테이블 모든 행의 data 키도 함께 변경한다.
// 타입 변경은 메타데이터만 바꾸며 기존 값은 보존한다(강제 변환하지 않음).
export function updateColumn(
  id: string,
  patch: { name?: string; type?: Column["type"]; enum_type_id?: string | null; description?: string | null; constraints?: ColumnConstraint | null }
): Column {
  ensure();
  const db = getDb();
  // cur 는 constraints 가 원본 JSON 문자열인 raw 행. 미지정 시 그대로 통과시켜 재인코딩을 피한다.
  const cur = db.prepare("SELECT * FROM columns WHERE id = ?").get(id) as ColumnRow | undefined;
  if (!cur) throw new Error("컬럼을 찾을 수 없습니다.");

  const newName = patch.name?.trim() || cur.name;
  const newTypeForGuard = patch.type ?? cur.type;
  // id 컬럼은 PK·행 자동 id 의 기준이므로 이름/타입 변경을 막는다(설명만 수정 가능).
  if (cur.name === "id" && (newName !== "id" || newTypeForGuard !== cur.type)) {
    throw new Error("'id' 컬럼의 이름·타입은 변경할 수 없습니다.");
  }
  if (newName !== cur.name) {
    const dup = db.prepare("SELECT id FROM columns WHERE table_id = ? AND name = ? AND id != ?").get(cur.table_id, newName, id);
    if (dup) throw new Error(`이미 '${newName}' 컬럼이 존재합니다.`);
  }
  const newType = patch.type ?? cur.type;
  const newEnumTypeId = newType === "enum" ? (patch.enum_type_id ?? cur.enum_type_id ?? null) : null;
  const newDesc = patch.description !== undefined ? patch.description : cur.description;
  // 미지정 시 cur.constraints(원본 문자열)를 그대로 보존(재인코딩 금지). 지정 시 stringify.
  const newConstraints = patch.constraints !== undefined ? (patch.constraints != null ? JSON.stringify(patch.constraints) : null) : cur.constraints;

  const tx = db.transaction(() => {
    db.prepare("UPDATE columns SET name = ?, type = ?, enum_type_id = ?, description = ?, constraints = ? WHERE id = ?")
      .run(newName, newType, newEnumTypeId, newDesc, newConstraints, id);
    if (newName !== cur.name) {
      const rows = db.prepare("SELECT id, data FROM rows WHERE table_id = ?").all(cur.table_id) as { id: string; data: string }[];
      const upd = db.prepare("UPDATE rows SET data = ?, updated_at = ? WHERE id = ?");
      const now = Date.now();
      for (const r of rows) {
        const d = JSON.parse(r.data) as Record<string, unknown>;
        if (Object.prototype.hasOwnProperty.call(d, cur.name)) {
          d[newName] = d[cur.name];
          delete d[cur.name];
          upd.run(JSON.stringify(d), now, r.id);
        }
      }
    }
  });
  tx();
  return parseColumn(db.prepare("SELECT * FROM columns WHERE id = ?").get(id) as ColumnRow);
}

// 주어진 순서대로 order_index 재부여
export function reorderColumns(tableId: string, orderedIds: string[]): void {
  ensure();
  const db = getDb();
  const upd = db.prepare("UPDATE columns SET order_index = ? WHERE id = ? AND table_id = ?");
  const tx = db.transaction(() => {
    orderedIds.forEach((id, i) => upd.run(i, id, tableId));
  });
  tx();
}

export function removeColumn(id: string): void {
  const db = getDb();
  const col = db.prepare("SELECT name FROM columns WHERE id = ?").get(id) as { name: string } | undefined;
  if (col?.name === "id") throw new Error("'id' 컬럼은 삭제할 수 없습니다.");
  db.prepare("DELETE FROM columns WHERE id = ?").run(id);
}
