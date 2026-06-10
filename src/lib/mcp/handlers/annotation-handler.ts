import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listAnnotations,
  listRowAnnotations,
  upsertAnnotation,
  deleteAnnotation,
} from "../../db/repo/annotations.js";
import { ok } from "./respond.js";

export function registerAnnotationHandlers(server: McpServer) {
  server.tool(
    "add_annotation",
    "행 또는 셀에 수치 근거 메모를 추가합니다",
    {
      project_id: z.string(),
      table_id: z.string(),
      row_id: z.string().optional(),
      column_name: z.string().optional(),
      note: z.string(),
    },
    async ({ project_id, table_id, row_id, column_name, note }) =>
      ok(upsertAnnotation(null, { project_id, table_id, row_id, column_name, note }))
  );

  server.tool(
    "get_annotations",
    "테이블(또는 특정 행)의 메모 목록을 조회합니다",
    { table_id: z.string(), row_id: z.string().optional() },
    async ({ table_id, row_id }) => {
      const annotations = row_id
        ? listRowAnnotations(table_id, row_id)
        : listAnnotations(table_id);
      return ok({ annotations, count: annotations.length });
    }
  );

  server.tool(
    "delete_annotation",
    "메모를 삭제합니다",
    { id: z.string() },
    async ({ id }) => {
      deleteAnnotation(id);
      return ok({ deleted: true });
    }
  );
}
