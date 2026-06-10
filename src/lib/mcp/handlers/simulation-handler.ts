import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listColumns } from "../../db/repo/columns.js";
import { readRows } from "../../db/repo/rows.js";
import { getTable } from "../../db/repo/tables.js";
import { listSimulations, saveSimulation } from "../../db/repo/simulations.js";
import { runMonteCarlo } from "../../simulation/combat.js";
import { runGachaSimulation } from "../../simulation/gacha.js";
import { runDpsSimulation } from "../../simulation/dps.js";
import { difficultyCurve } from "../../simulation/difficulty.js";
import { ok } from "./respond.js";

const buildSpecSchema = z.object({
  name: z.string(),
  atk: z.number(),
  def: z.number(),
  critRate: z.number().optional(),
  critMult: z.number().optional(),
  attackSpeed: z.number().optional(),
});

const unitSchema = z.object({
  name: z.string(),
  hp: z.number(),
  atk: z.number(),
  def: z.number(),
  speed: z.number(),
  critRate: z.number().optional(),
  critMult: z.number().optional(),
});

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

  server.tool(
    "run_combat_simulation",
    "네이티브 전투 몬테카를로 시뮬(승률+Wilson CI+HP추이+로그)",
    {
      attacker: z.array(unitSchema),
      defender: z.array(unitSchema),
      iterations: z.number().default(1000),
      seed: z.number().default(0),
    },
    async ({ attacker, defender, iterations, seed }) =>
      ok(runMonteCarlo(attacker, defender, iterations, seed))
  );

  server.tool(
    "run_gacha_simulation",
    "가챠 몬테카를로 시뮬(소프트 천장 반영, avgPulls·maxPulls·pityHitRate·distribution)",
    {
      baseRate: z.number(),
      pityStart: z.number(),
      pityCap: z.number(),
      iterations: z.number().default(10000),
      seed: z.number().default(0),
    },
    async ({ baseRate, pityStart, pityCap, iterations, seed }) =>
      ok(runGachaSimulation(baseRate, pityStart, pityCap, iterations, seed))
  );

  server.tool(
    "run_dps_simulation",
    "빌드별 DPS 몬테카를로 시뮬(per-hit 데미지 samples + mean/min/max로 빌드 비교)",
    {
      builds: z.array(buildSpecSchema),
      iterations: z.number().default(10000),
      seed: z.number().default(0),
    },
    async ({ builds, iterations, seed }) =>
      ok(runDpsSimulation(builds, iterations, seed))
  );

  server.tool(
    "run_difficulty_simulation",
    "스테이지별 난이도 곡선 시뮬(스테이지마다 플레이어 vs 적 1:1 몬테카를로 → 승률·CI·평균턴·플레이타임·파워비)",
    {
      player: unitSchema,
      stages: z.array(z.object({ label: z.string(), enemy: unitSchema })),
      secondsPerTurn: z.number().default(1),
      iterations: z.number().default(500),
      seed: z.number().default(0),
    },
    async ({ player, stages, secondsPerTurn, iterations, seed }) =>
      ok(difficultyCurve(player, stages, secondsPerTurn, iterations, seed))
  );
}
