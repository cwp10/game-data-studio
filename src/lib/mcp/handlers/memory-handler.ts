import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readProjectMemory, writeProjectMemory } from "../../memory/projectMemory.js";
import { ok } from "./respond.js";

export function registerMemoryHandlers(server: McpServer) {
  server.tool(
    "get_project_memory",
    "프로젝트의 누적 메모리(맥락·설계 결정·네이밍/수치 규칙·진행 상황) 조회",
    { project_id: z.string() },
    async ({ project_id }) => ok({ project_id, memory: readProjectMemory(project_id) })
  );

  server.tool(
    "update_project_memory",
    "프로젝트 메모리를 갱신(전체 교체). 기존 내용을 보존·정리하면서 새 맥락을 추가한 마크다운 전체 문서를 content로 전달할 것.",
    { project_id: z.string(), content: z.string() },
    async ({ project_id, content }) => { writeProjectMemory(project_id, content); return ok({ updated: true, bytes: content.length }); }
  );
}
