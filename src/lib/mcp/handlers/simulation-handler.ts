import { listColumns } from "../../db/repo/columns.js";
import { readRows } from "../../db/repo/rows.js";
import { getSimulation, listSimulations, saveSimulation } from "../../db/repo/simulations.js";
import { getTable } from "../../db/repo/tables.js";

type ToolReg = (name: string, desc: string, schema: object, handler: (args: Record<string, unknown>) => unknown) => void;

export function registerSimulationHandlers(server: { tool: ToolReg }) {
  server.tool(
    "run_simulation",
    "관계 테이블 JOIN 연산 → 수식 도출용 데이터 반환. Claude가 C# 수식 산출",
    {
      type: "object",
      properties: {
        project_id: { type: "string" },
        input_tables: { type: "array", items: { type: "string" }, description: "참조 테이블 id 목록" },
        target_columns: {
          type: "array",
          items: { type: "string" },
          description: "table_id.column_name 형식",
        },
      },
      required: ["project_id", "input_tables"],
    },
    (args) => {
      const tableIds = args.input_tables as string[];
      const targetCols = (args.target_columns as string[] | undefined) ?? [];

      const snapshot: Record<string, { table: unknown; columns: unknown[]; rows: unknown[] }> = {};
      for (const tid of tableIds) {
        const table = getTable(tid);
        if (!table) continue;
        const columns = listColumns(tid);
        const rows = readRows(tid, { limit: 200 });
        snapshot[tid] = { table, columns, rows };
      }

      return ok({
        snapshot,
        target_columns: targetCols,
        instruction:
          "위 스냅샷 데이터를 분석하여 target_columns 간 관계를 수식으로 도출하고 Unity C# 코드를 작성하세요.",
      });
    }
  );

  server.tool(
    "list_simulations",
    "저장된 시뮬레이션 목록",
    { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] },
    (args) => ok(listSimulations(args.project_id as string))
  );

  server.tool(
    "save_simulation",
    "시뮬레이션 결과(수식 포함) 저장",
    {
      type: "object",
      properties: {
        project_id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        input_tables: { type: "array", items: { type: "string" } },
        result: { type: "object" },
        formula_cs: { type: "string" },
      },
      required: ["project_id", "name"],
    },
    (args) =>
      ok(
        saveSimulation({
          project_id: args.project_id as string,
          name: args.name as string,
          description: args.description as string | undefined,
          input_tables: args.input_tables as string[] | undefined,
          result: args.result,
          formula_cs: args.formula_cs as string | undefined,
        })
      )
  );
}

function ok(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
}
