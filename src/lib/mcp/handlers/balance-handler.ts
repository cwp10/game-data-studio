import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listColumns } from "../../db/repo/columns.js";
import { readRows } from "../../db/repo/rows.js";
import { analyzeColumns } from "../../balance/analyze.js";
import { ok } from "./respond.js";

export function registerBalanceHandlers(server: McpServer) {
  server.tool(
    "analyze_balance",
    "선택 컬럼 통계 계산 및 이상값 감지 (z-score 기반)",
    { table_id: z.string(), columns: z.array(z.string()).optional(), group_by: z.string().optional() },
    async ({ table_id, columns, group_by }) => {
      const targetCols = columns ?? listColumns(table_id).filter((c) => c.type === "number").map((c) => c.name);
      return ok(analyzeColumns(readRows(table_id), targetCols, group_by));
    }
  );
}
