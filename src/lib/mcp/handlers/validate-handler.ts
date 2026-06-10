import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listColumns } from "../../db/repo/columns.js";
import { readRows } from "../../db/repo/rows.js";
import { listRelations } from "../../db/repo/relations.js";
import { validateRows, type ColumnSpec } from "../../validation/index.js";
import { findBrokenRefs, type RelationSpec, type RowsByTable } from "../../validation/fk.js";
import { ok } from "./respond.js";

export function registerValidateHandlers(server: McpServer) {
  server.tool(
    "validate_table",
    "테이블 행 데이터를 컬럼 제약(min/max/required/unique)으로 검증해 위반 목록 반환",
    { table_id: z.string() },
    async ({ table_id }) => {
      const specs: ColumnSpec[] = listColumns(table_id).map((c) => ({
        name: c.name,
        type: c.type,
        constraints: c.constraints ?? undefined,
      }));
      const rows = readRows(table_id).map((r) => ({ id: r.id, data: r.data }));
      return ok(validateRows(rows, specs));
    }
  );

  server.tool(
    "check_fk_integrity",
    "프로젝트 relations 기준 깨진 FK 참조(참조 대상 없는 값)를 검출해 목록 반환. 읽기 전용 — 삭제/수정 안 함",
    { project_id: z.string() },
    async ({ project_id }) => {
      const relations: RelationSpec[] = listRelations(project_id).map((r) => ({
        from_table_id: r.from_table_id,
        from_column: r.from_column,
        to_table_id: r.to_table_id,
        to_column: r.to_column,
      }));
      if (!relations.length) return ok({ broken: [] });

      const tableIds = new Set<string>();
      for (const rel of relations) {
        tableIds.add(rel.from_table_id);
        tableIds.add(rel.to_table_id);
      }

      const rowsByTable: RowsByTable = {};
      for (const tid of tableIds) {
        rowsByTable[tid] = readRows(tid).map((r) => ({ id: r.id, data: r.data }));
      }

      return ok({ broken: findBrokenRefs(relations, rowsByTable) });
    }
  );
}
