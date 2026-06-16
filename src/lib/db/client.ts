import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { DB_PATH, DATA_DIR } from "../util/paths";

let _db: Database.Database | null = null;

// CREATE TABLE IF NOT EXISTS — 항상 실행해도 안전(멱등)
const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  genre       TEXT,
  description TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tables (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS columns (
  id           TEXT PRIMARY KEY,
  table_id     TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,
  order_index  INTEGER NOT NULL DEFAULT 0,
  description  TEXT,
  enum_type_id TEXT,
  constraints  TEXT,
  created_at   INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS enum_types (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  allowed_values TEXT NOT NULL,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rows (
  id          TEXT PRIMARY KEY,
  table_id    TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  data        TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS relations (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  from_column   TEXT NOT NULL,
  to_table_id   TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  to_column     TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS simulations (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  input_tables TEXT,
  result       TEXT,
  formula_cs   TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  table_id   TEXT,
  role       TEXT NOT NULL CHECK(role IN ('user','assistant','tool')),
  content    TEXT NOT NULL,
  tool_name  TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS snapshots (
  id         TEXT PRIMARY KEY,
  table_id   TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  data       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS economy_scenarios (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  data       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_table ON snapshots(table_id, created_at);
CREATE INDEX IF NOT EXISTS idx_economy_project ON economy_scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_tables_project    ON tables(project_id);
CREATE INDEX IF NOT EXISTS idx_columns_table     ON columns(table_id, order_index);
CREATE INDEX IF NOT EXISTS idx_rows_table        ON rows(table_id, order_index);
CREATE INDEX IF NOT EXISTS idx_relations_project ON relations(project_id);
CREATE INDEX IF NOT EXISTS idx_simulations_project ON simulations(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_project      ON chat_messages(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_enum_types_project ON enum_types(project_id);
`;

export function getDb(): Database.Database {
  if (_db) return _db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  // 두 프로세스(Next.js + MCP 서버)가 같은 DB를 쓰므로, 쓰기 잠금 충돌 시
  // 즉시 SQLITE_BUSY 로 실패하지 않고 대기하도록 한다.
  _db.pragma("busy_timeout = 5000");
  // DB 파일이 새로 생성된 경우에도 스키마가 항상 적용되도록 한다.
  _db.exec(BOOTSTRAP_SQL);
  return _db;
}
