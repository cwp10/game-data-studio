import { createProject, deleteProject, listProjects } from "../../db/repo/projects.js";
import { listTables } from "../../db/repo/tables.js";

export function registerProjectHandlers(server: {
  tool: (name: string, desc: string, schema: object, handler: (args: Record<string, unknown>) => unknown) => void;
}) {
  server.tool("list_projects", "전체 프로젝트 목록 반환", { type: "object", properties: {}, required: [] }, () => {
    const projects = listProjects();
    const withStats = projects.map((p) => {
      const tables = listTables(p.id);
      return { ...p, table_count: tables.length };
    });
    return ok(withStats);
  });

  server.tool(
    "create_project",
    "새 프로젝트 생성",
    {
      type: "object",
      properties: {
        name: { type: "string" },
        genre: { type: "string" },
        description: { type: "string" },
      },
      required: ["name"],
    },
    (args) => {
      const project = createProject({
        name: args.name as string,
        genre: args.genre as string | undefined,
        description: args.description as string | undefined,
      });
      return ok(project);
    }
  );

  server.tool(
    "delete_project",
    "프로젝트 및 하위 데이터 전체 삭제",
    { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] },
    (args) => {
      deleteProject(args.project_id as string);
      return ok({ deleted: true });
    }
  );
}

function ok(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
}
