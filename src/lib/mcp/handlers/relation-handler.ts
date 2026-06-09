import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { deleteRelation, listRelations, setRelation } from "../../db/repo/relations.js";
import { ok } from "./respond.js";

export function registerRelationHandlers(server: McpServer) {
  server.tool(
    "list_relations",
    "프로젝트 내 전체 관계 목록",
    { project_id: z.string() },
    async ({ project_id }) => ok(listRelations(project_id))
  );

  server.tool(
    "set_relation",
    "테이블 간 FK 관계 설정",
    { project_id: z.string(), from_table_id: z.string(), from_column: z.string(), to_table_id: z.string(), to_column: z.string() },
    async (args) => ok(setRelation(args))
  );

  server.tool(
    "delete_relation",
    "관계 삭제",
    { relation_id: z.string() },
    async ({ relation_id }) => { deleteRelation(relation_id); return ok({ deleted: true }); }
  );
}
