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
  type         TEXT NOT NULL CHECK(type IN ('string','number','boolean')),
  order_index  INTEGER NOT NULL DEFAULT 0,
  description  TEXT,
  created_at   INTEGER NOT NULL
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

CREATE INDEX IF NOT EXISTS idx_tables_project    ON tables(project_id);
CREATE INDEX IF NOT EXISTS idx_columns_table     ON columns(table_id, order_index);
CREATE INDEX IF NOT EXISTS idx_rows_table        ON rows(table_id, order_index);
CREATE INDEX IF NOT EXISTS idx_relations_project ON relations(project_id);
CREATE INDEX IF NOT EXISTS idx_simulations_project ON simulations(project_id);
