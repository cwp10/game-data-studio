import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface ChatMessage {
  id: string;
  project_id: string;
  table_id: string | null;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_name: string | null;
  created_at: number;
}

// 기존 DB에도 안전하게 적용되도록 최초 사용 시 테이블을 보장한다(자가 부트스트랩).
let ensured = false;
function ensure() {
  if (ensured) return;
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      table_id   TEXT,
      role       TEXT NOT NULL CHECK(role IN ('user','assistant','tool')),
      content    TEXT NOT NULL,
      tool_name  TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_project ON chat_messages(project_id, created_at);
  `);
  ensured = true;
}

export function listMessages(projectId: string): ChatMessage[] {
  ensure();
  // rowid = 삽입 순서 = 정확한 대화 순서 (nanoid는 정렬 불가하므로 created_at 타이브레이커로 부적합)
  return getDb()
    .prepare("SELECT * FROM chat_messages WHERE project_id = ? ORDER BY rowid")
    .all(projectId) as ChatMessage[];
}

export function addMessage(m: {
  project_id: string;
  table_id?: string | null;
  role: ChatMessage["role"];
  content: string;
  tool_name?: string | null;
}): ChatMessage {
  ensure();
  const id = newId();
  const now = Date.now();
  getDb()
    .prepare(
      "INSERT INTO chat_messages (id, project_id, table_id, role, content, tool_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, m.project_id, m.table_id ?? null, m.role, m.content, m.tool_name ?? null, now);
  return getDb().prepare("SELECT * FROM chat_messages WHERE id = ?").get(id) as ChatMessage;
}

export function clearMessages(projectId: string): void {
  ensure();
  getDb().prepare("DELETE FROM chat_messages WHERE project_id = ?").run(projectId);
}
