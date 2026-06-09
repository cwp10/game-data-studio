import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

// 임시 디렉터리에 "구버전" 스키마(columns에 CHECK 제약, enum_type_id 없음)로
// DB를 만들고, repo 가 첫 사용 시 마이그레이션하는지 실제 SQLite 로 검증한다.
// repo 들이 getDb() → paths.ts(GDS_DATA_DIR) 를 모듈 로드 시 읽으므로
// 동적 import 전에 환경변수를 설정한다.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gds-test-"));
process.env.GDS_DATA_DIR = tmp;

beforeAll(() => {
  const db = new Database(path.join(tmp, "game-data-studio.db"));
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, genre TEXT, description TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE tables (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, order_index INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE columns (id TEXT PRIMARY KEY, table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE, name TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('string','number','boolean')), order_index INTEGER NOT NULL DEFAULT 0, description TEXT, created_at INTEGER NOT NULL);
    CREATE TABLE rows (id TEXT PRIMARY KEY, table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE, data TEXT NOT NULL, order_index INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
  `);
  const now = Date.now();
  db.prepare("INSERT INTO projects VALUES (?,?,?,?,?,?)").run("p1", "Test", null, null, now, now);
  db.prepare("INSERT INTO tables VALUES (?,?,?,?,?,?,?)").run("t1", "p1", "characters", null, 0, now, now);
  db.prepare("INSERT INTO columns VALUES (?,?,?,?,?,?,?)").run("c1", "t1", "hp", "number", 0, "최대 체력", now);
  db.prepare("INSERT INTO rows VALUES (?,?,?,?,?,?)").run("r1", "t1", JSON.stringify({ hp: 100 }), 0, now, now);
  db.close();
});

describe("columns 마이그레이션 (구버전 → enum_type_id, CHECK 제거)", () => {
  it("기존 컬럼/데이터를 보존하며 마이그레이션하고 enum 타입을 허용한다", async () => {
    const { listColumns, addColumn } = await import("./columns");
    const cols = listColumns("t1"); // 첫 호출 → ensure() 마이그레이션 트리거
    expect(cols.map((c) => c.name)).toContain("hp");
    expect(cols.find((c) => c.name === "hp")?.description).toBe("최대 체력"); // 데이터 보존
    expect(cols[0]).toHaveProperty("enum_type_id");

    // 구버전 CHECK 가 제거되어 enum 타입 컬럼을 추가할 수 있다
    const ec = addColumn({ table_id: "t1", name: "grade", type: "enum", enum_type_id: "et1" });
    expect(ec.type).toBe("enum");
    expect(ec.enum_type_id).toBe("et1");
  });

  it("중복 컬럼명을 거부한다", async () => {
    const { addColumn } = await import("./columns");
    expect(() => addColumn({ table_id: "t1", name: "hp", type: "number" })).toThrow();
  });

  it("이름 변경 시 행 데이터의 키도 함께 바뀐다", async () => {
    const { listColumns, updateColumn } = await import("./columns");
    const { readRows } = await import("./rows");
    const hp = listColumns("t1").find((c) => c.name === "hp")!;
    updateColumn(hp.id, { name: "health" });
    const row = readRows("t1")[0];
    expect("hp" in row.data).toBe(false);
    expect(row.data.health).toBe(100);
  });
});

describe("기본 id 컬럼 + 행 유니크 id", () => {
  it("createTable 은 id 컬럼을 자동 생성한다", async () => {
    const { createTable } = await import("./tables");
    const { listColumns } = await import("./columns");
    const t = createTable({ project_id: "p1", name: "items" });
    const names = listColumns(t.id).map((c) => c.name);
    expect(names).toContain("id");
  });

  it("upsertRow 는 빈 id 를 유니크 값(행 id)으로 채우고, 명시 id 는 보존한다", async () => {
    const { createTable } = await import("./tables");
    const { upsertRow } = await import("./rows");
    const t = createTable({ project_id: "p1", name: "stages" });

    const auto = upsertRow(t.id, undefined, { id: "" });
    expect(auto.data.id).toBe(auto.id);
    expect(String(auto.data.id).length).toBeGreaterThan(0);

    const explicit = upsertRow(t.id, undefined, { id: "stage_001" });
    expect(explicit.data.id).toBe("stage_001");
  });
});
