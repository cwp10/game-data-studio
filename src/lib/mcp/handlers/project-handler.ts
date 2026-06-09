import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createProject, deleteProject, listProjects } from "../../db/repo/projects.js";
import { listTables } from "../../db/repo/tables.js";
import { ok } from "./respond.js";

export function registerProjectHandlers(server: McpServer) {
  server.tool("list_projects", "전체 프로젝트 목록 반환", {}, async () => {
    const projects = listProjects();
    const withStats = projects.map((p) => ({ ...p, table_count: listTables(p.id).length }));
    return ok(withStats);
  });

  server.tool(
    "create_project",
    "새 프로젝트 생성. genre 입력 시 Claude가 풀 스키마 자동 생성",
    { name: z.string(), genre: z.string().optional(), description: z.string().optional() },
    async ({ name, genre, description }) => ok(createProject({ name, genre, description }))
  );

  server.tool(
    "delete_project",
    "프로젝트 및 하위 데이터 전체 삭제",
    { project_id: z.string() },
    async ({ project_id }) => { deleteProject(project_id); return ok({ deleted: true }); }
  );
}
