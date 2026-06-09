import { getDb } from "../client";
import { newId } from "../../util/ids";

export interface Project {
  id: string;
  name: string;
  genre: string | null;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export function listProjects(): Project[] {
  return getDb().prepare("SELECT * FROM projects ORDER BY updated_at DESC").all() as Project[];
}

export function getProject(id: string): Project | undefined {
  return getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
}

export function createProject(data: { name: string; genre?: string; description?: string }): Project {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    "INSERT INTO projects (id, name, genre, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, data.name, data.genre ?? null, data.description ?? null, now, now);
  return getProject(id)!;
}

export function updateProject(id: string, data: Partial<Pick<Project, "name" | "genre" | "description">>): Project {
  const db = getDb();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); vals.push(data.name); }
  if (data.genre !== undefined) { sets.push("genre = ?"); vals.push(data.genre); }
  if (data.description !== undefined) { sets.push("description = ?"); vals.push(data.description); }
  sets.push("updated_at = ?"); vals.push(Date.now());
  vals.push(id);
  db.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return getProject(id)!;
}

export function deleteProject(id: string): void {
  const db = getDb();
  // enum_types / chat_messages 는 lazy-bootstrap 테이블이라 FK CASCADE 가 없을 수 있다.
  // (기존 DB 호환) 명시적으로 정리해 고아 행이 남지 않도록 한다.
  const tx = db.transaction(() => {
    for (const t of ["enum_types", "chat_messages"]) {
      try { db.prepare(`DELETE FROM ${t} WHERE project_id = ?`).run(id); } catch { /* 테이블 미존재 시 무시 */ }
    }
    db.prepare("DELETE FROM projects WHERE id = ?").run(id); // tables/columns/rows/relations 는 실제 FK CASCADE
  });
  tx();
}
