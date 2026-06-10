import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { generateCurveIntoTable } from "../../curve/apply.js";
import { solveCurve } from "../../curve/solve.js";
import { fitCurve } from "../../curve/fit.js";
import { ok } from "./respond.js";

export function registerCurveHandlers(server: McpServer) {
  server.tool(
    "generate_curve",
    "레벨별 성장 곡선 값을 계산해 테이블 행으로 생성. type: linear(base+factor*(L-1)) | power(base*L^factor) | exponential(base*factor^(L-1)). 컬럼은 자동 생성됨",
    {
      table_id: z.string(),
      value_column: z.string(),
      level_column: z.string().optional(),
      type: z.enum(["linear", "power", "exponential", "logarithmic", "quadratic"]),
      base: z.number(),
      factor: z.number(),
      count: z.number(),
      round: z.boolean().optional(),
      replace: z.boolean().optional(),
    },
    async ({ table_id, value_column, level_column, type, base, factor, count, round, replace }) =>
      ok(generateCurveIntoTable({ table_id, value_column, level_column: level_column ?? "level", type, base, factor, count, round, replace }))
  );

  server.tool(
    "solve_curve",
    "목표값 역산. targetLevel 에서 targetValue 가 되도록 base/type 고정 후 factor 를 이분 역산. 반환: { solved, factor, achievedValue }. 해 없으면 solved=false",
    {
      type: z.enum(["linear", "power", "exponential", "logarithmic", "quadratic"]),
      base: z.number(),
      targetLevel: z.number(),
      targetValue: z.number(),
    },
    async ({ type, base, targetLevel, targetValue }) =>
      ok(solveCurve(type, base, targetLevel, targetValue))
  );

  server.tool(
    "fit_curve",
    "관측 점들로부터 곡선 파라미터를 닫힌형(OLS/로그선형화)으로 복원. points: {level,value}[], type 5종. 반환: { base, factor, r2 }",
    {
      points: z.array(z.object({ level: z.number(), value: z.number() })),
      type: z.enum(["linear", "power", "exponential", "logarithmic", "quadratic"]),
    },
    async ({ points, type }) => ok(fitCurve(points, type))
  );
}
