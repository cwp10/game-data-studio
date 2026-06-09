import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createProject, deleteProject, listProjects } from "../db/repo/projects.js";
import { addColumn, listColumns, removeColumn } from "../db/repo/columns.js";
import { createTable, deleteTable, getTable, listTables } from "../db/repo/tables.js";
import { deleteRow, readRows, upsertRow } from "../db/repo/rows.js";
import { deleteRelation, listRelations, setRelation } from "../db/repo/relations.js";
import { getSimulation, listSimulations, saveSimulation } from "../db/repo/simulations.js";
import { readProjectMemory, writeProjectMemory } from "../memory/projectMemory.js";
import fs from "fs";
import path from "path";

const server = new McpServer({ name: "game-data-studio", version: "1.0.0" });

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// ── Projects ─────────────────────────────────────────────
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

// ── Tables ────────────────────────────────────────────────
server.tool(
  "list_tables",
  "프로젝트 내 테이블 목록",
  { project_id: z.string() },
  async ({ project_id }) => ok(listTables(project_id))
);

server.tool(
  "create_table",
  "테이블 생성 (컬럼 정의 포함 가능)",
  {
    project_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    columns: z.array(z.object({ name: z.string(), type: z.enum(["string", "number", "boolean"]), description: z.string().optional() })).optional(),
  },
  async ({ project_id, name, description, columns }) => {
    const table = createTable({ project_id, name, description });
    const cols = (columns ?? []).map((c, i) =>
      addColumn({ table_id: table.id, name: c.name, type: c.type, description: c.description, order_index: i })
    );
    return ok({ table, columns: cols });
  }
);

server.tool(
  "delete_table",
  "테이블 삭제",
  { table_id: z.string() },
  async ({ table_id }) => { deleteTable(table_id); return ok({ deleted: true }); }
);

// ── Columns ───────────────────────────────────────────────
server.tool(
  "add_column",
  "컬럼 추가",
  { table_id: z.string(), name: z.string(), type: z.enum(["string", "number", "boolean"]), description: z.string().optional() },
  async ({ table_id, name, type, description }) => {
    const existing = listColumns(table_id);
    return ok(addColumn({ table_id, name, type, description, order_index: existing.length }));
  }
);

server.tool(
  "remove_column",
  "컬럼 삭제",
  { column_id: z.string() },
  async ({ column_id }) => { removeColumn(column_id); return ok({ deleted: true }); }
);

// ── Rows ──────────────────────────────────────────────────
server.tool(
  "read_rows",
  "행 조회. 페이징 지원",
  { table_id: z.string(), limit: z.number().optional(), offset: z.number().optional() },
  async ({ table_id, limit, offset }) => ok(readRows(table_id, { limit, offset }))
);

server.tool(
  "upsert_row",
  "행 삽입 또는 수정",
  { table_id: z.string(), id: z.string().optional(), data: z.record(z.unknown()) },
  async ({ table_id, id, data }) => ok(upsertRow(table_id, id, data as Record<string, unknown>))
);

server.tool(
  "delete_row",
  "행 삭제",
  { row_id: z.string() },
  async ({ row_id }) => { deleteRow(row_id); return ok({ deleted: true }); }
);

// ── CSV ───────────────────────────────────────────────────
server.tool(
  "import_csv",
  "로컬 CSV 파일 임포트. 신규 컬럼 자동 추가",
  { table_id: z.string(), file_path: z.string() },
  async ({ table_id, file_path }) => {
    const content = fs.readFileSync(path.resolve(file_path), "utf-8");
    const lines = content.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const dataRows = lines.slice(1).map((l) => l.split(",").map((v) => v.trim().replace(/^"|"$/g, "")));

    const existingCols = listColumns(table_id);
    const existingNames = new Set(existingCols.map((c) => c.name));
    for (const h of headers) {
      if (!existingNames.has(h)) {
        const sample = dataRows[0]?.[headers.indexOf(h)] ?? "";
        const type = sample !== "" && !isNaN(Number(sample)) ? "number" : "string";
        addColumn({ table_id, name: h, type: type as "string" | "number", order_index: existingCols.length });
      }
    }
    let imported = 0;
    for (const row of dataRows) {
      const data: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        const v = row[i] ?? "";
        data[h] = v !== "" && !isNaN(Number(v)) ? Number(v) : v;
      });
      upsertRow(table_id, undefined, data);
      imported++;
    }
    return ok({ imported, headers });
  }
);

server.tool(
  "export_csv",
  "테이블을 CSV로 익스포트",
  { table_id: z.string(), output_path: z.string() },
  async ({ table_id, output_path }) => {
    const cols = listColumns(table_id);
    const rows = readRows(table_id);
    const headers = cols.map((c) => c.name);
    const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => String(r.data[h] ?? "")).join(","))];
    const outPath = path.resolve(output_path);
    fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
    return ok({ exported: rows.length, path: outPath });
  }
);

// ── Relations ─────────────────────────────────────────────
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

// ── Balance ───────────────────────────────────────────────
server.tool(
  "analyze_balance",
  "선택 컬럼 통계 계산 및 이상값 감지 (z-score 기반)",
  { table_id: z.string(), columns: z.array(z.string()).optional(), group_by: z.string().optional() },
  async ({ table_id, columns, group_by }) => {
    const targetCols = columns ?? listColumns(table_id).filter((c) => c.type === "number").map((c) => c.name);
    const rows = readRows(table_id);
    const results = [];
    for (const col of targetCols) {
      const groups: Record<string, Array<{ row_id: string; value: number }>> = {};
      for (const row of rows) {
        const raw = row.data[col];
        if (typeof raw !== "number") continue;
        const group = group_by ? String(row.data[group_by] ?? "_all") : "_all";
        (groups[group] ??= []).push({ row_id: row.id, value: raw });
      }
      for (const [group, vals] of Object.entries(groups)) {
        if (vals.length < 2) continue;
        const nums = vals.map((v) => v.value);
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const stddev = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
        const anomalies = vals
          .map((v) => ({ ...v, z_score: stddev > 0 ? Math.abs(v.value - mean) / stddev : 0 }))
          .filter((v) => v.z_score > 2)
          .map((v) => ({ ...v, severity: v.z_score > 3 ? "danger" : "warn" }));
        results.push({ column: group_by ? `${col} [${group}]` : col, mean, stddev, min: Math.min(...nums), max: Math.max(...nums), anomalies });
      }
    }
    return ok({ results, total_anomalies: results.reduce((a, r) => a + r.anomalies.length, 0) });
  }
);

// ── Simulation ────────────────────────────────────────────
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

// ── Project Memory ────────────────────────────────────────
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

// ── Start ─────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("game-data-studio MCP server running");
