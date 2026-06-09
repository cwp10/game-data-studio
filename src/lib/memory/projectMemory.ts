import fs from "fs";
import path from "path";
import { DATA_DIR } from "../util/paths";

// 프로젝트별 누적 메모리(맥락·결정·규칙)를 마크다운 파일로 보관한다.
// data/project-memory/<project_id>.md — 사람이 직접 열어 편집 가능.
const MEM_DIR = path.join(DATA_DIR, "project-memory");

function safeId(id: string): string {
  // project_id는 AI/사용자 입력으로 들어올 수 있으므로 경로 트래버설 차단
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`invalid project_id: ${id}`);
  return id;
}

export function memoryFilePath(projectId: string): string {
  return path.join(MEM_DIR, `${safeId(projectId)}.md`);
}

export function readProjectMemory(projectId: string): string {
  try {
    return fs.readFileSync(memoryFilePath(projectId), "utf-8");
  } catch {
    return "";
  }
}

export function writeProjectMemory(projectId: string, content: string): void {
  fs.mkdirSync(MEM_DIR, { recursive: true });
  fs.writeFileSync(memoryFilePath(projectId), content, "utf-8");
}
