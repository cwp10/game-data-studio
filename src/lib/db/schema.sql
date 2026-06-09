-- game-data-studio SQLite schema
-- id: nanoid string, timestamp: epoch ms (INTEGER)

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
  type         TEXT NOT NULL,            -- 'string'|'number'|'boolean'|'enum' (앱에서 검증)
  order_index  INTEGER NOT NULL DEFAULT 0,
  description  TEXT,
  enum_type_id TEXT,                     -- type='enum' 일 때 enum_types.id 참조
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS enum_types (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  allowed_values TEXT NOT NULL,          -- JSON 배열
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
  table_id   TEXT,                                              -- 작성 시점에 보던 테이블(태그용, FK 아님)
  role       TEXT NOT NULL CHECK(role IN ('user','assistant','tool')),
  content    TEXT NOT NULL,
  tool_name  TEXT,                                              -- role='tool' 일 때 호출된 MCP 툴 이름
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tables_project    ON tables(project_id);
CREATE INDEX IF NOT EXISTS idx_columns_table     ON columns(table_id, order_index);
CREATE INDEX IF NOT EXISTS idx_rows_table        ON rows(table_id, order_index);
CREATE INDEX IF NOT EXISTS idx_relations_project ON relations(project_id);
CREATE INDEX IF NOT EXISTS idx_simulations_project ON simulations(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_project      ON chat_messages(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_enum_types_project ON enum_types(project_id);
