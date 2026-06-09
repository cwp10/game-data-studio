import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { DB_PATH, DATA_DIR } from "../util/paths";

let _db: Database.Database | null = null;

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
  return _db;
}
