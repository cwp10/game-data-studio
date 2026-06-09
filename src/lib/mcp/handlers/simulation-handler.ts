import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listColumns } from "../../db/repo/columns.js";
import { readRows } from "../../db/repo/rows.js";
import { getTable } from "../../db/repo/tables.js";
import { listSimulations, saveSimulation } from "../../db/repo/simulations.js";
import { ok } from "./respond.js";

export function registerSimulationHandlers(server: McpServer) {
  server.tool(
    "run_simulation",
    "관계 테이블 데이터 스냅샷 반환 → Claude가 C# 수식 산출",
    { project_id: z.string(), input_tables: z.array(z.string()), target_columns: z.array(z.string()).optional() },
    async ({ project_id, input_tables, target_columns }) => {
      const snapshot: Record<string, unknown> = {};
      for (const tid of input_tables) {
        const table = getTable(tid);
        if (!table) continue;
        snapshot[tid] = { table, columns: listColumns(tid), rows: readRows(tid, { limit: 200 }) };
      }
      return ok({ snapshot, target_columns: target_columns ?? [], instruction: "위 스냅샷을 분석하여 target_columns 간 수식을 도출하고 Unity C# 코드를 작성하세요." });
    }
  );

  server.tool(
    "list_simulations",
    "저장된 시뮬레이션 목록",
    { project_id: z.string() },
    async ({ project_id }) => ok(listSimulations(project_id))
  );

  server.tool(
    "save_simulation",
    "시뮬레이션 결과(수식 포함) 저장",
    {
      project_id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      input_tables: z.array(z.string()).optional(),
      result: z.record(z.unknown()).optional(),
      formula_cs: z.string().optional(),
    },
    async (args) => ok(saveSimulation(args))
  );
}
