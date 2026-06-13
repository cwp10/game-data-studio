import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { generateCurveIntoTable } from "../../curve/apply.js";
import { computeAt } from "../../curve/generate.js";
import { solveCurve } from "../../curve/solve.js";
import { fitCurve } from "../../curve/fit.js";
import { ok } from "./respond.js";

export function registerCurveHandlers(server: McpServer) {
  server.tool(
    "generate_curve",
    "레벨별 성장 곡선 값을 계산해 테이블 행으로 생성. type: linear(base+factor*(L-1)) | power(base*L^factor) | exponential(base*factor^(L-1)) | logarithmic | quadratic | s_curve(base+range/(1+exp(-rate*(L-midpoint)))). 컬럼은 자동 생성됨",
    {
      table_id: z.string(),
      value_column: z.string(),
      level_column: z.string().optional(),
      type: z.enum(["linear", "power", "exponential", "logarithmic", "quadratic", "s_curve"]),
      base: z.number(),
      factor: z.number(),
      count: z.number(),
      round: z.boolean().optional(),
      replace: z.boolean().optional(),
      range: z.number().optional(),
      rate: z.number().optional(),
      midpoint: z.number().optional(),
    },
    async ({ table_id, value_column, level_column, type, base, factor, count, round, replace, range, rate, midpoint }) =>
      ok(generateCurveIntoTable({ table_id, value_column, level_column: level_column ?? "level", type, base, factor, count, round, replace, range, rate, midpoint }))
  );

  server.tool(
    "solve_curve",
    "목표값 역산. targetLevel 에서 targetValue 가 되도록 base/type 고정 후 factor 를 이분 역산. 반환: { solved, factor, achievedValue }. 해 없으면 solved=false",
    {
      type: z.enum(["linear", "power", "exponential", "logarithmic", "quadratic", "s_curve"]),
      base: z.number(),
      targetLevel: z.number(),
      targetValue: z.number(),
    },
    async ({ type, base, targetLevel, targetValue }) =>
      ok(solveCurve(type, base, targetLevel, targetValue))
  );

  server.tool(
    "fit_curve",
    "관측 점들로부터 곡선 파라미터를 닫힌형(OLS/로그선형화)으로 복원. points: {level,value}[], type 6종. s_curve는 logit 선형화. 반환: { base, factor, r2, range?, rate?, midpoint? }",
    {
      points: z.array(z.object({ level: z.number(), value: z.number() })),
      type: z.enum(["linear", "power", "exponential", "logarithmic", "quadratic", "s_curve"]),
    },
    async ({ points, type }) => ok(fitCurve(points, type))
  );

  server.tool(
    "eval_formula",
    "공식 파라미터로 임의 레벨 목록에서 스탯값을 온디맨드 계산. DB 쓰기 없음. levels 최대 100개 (예: [1,10,100,1000,10000,100000]). s_curve는 midpoint 명시 필수(count 기반 기본값 없음). 반환: { results: [{level,value}] }",
    {
      type: z.enum(["linear", "power", "exponential", "logarithmic", "quadratic", "s_curve"]),
      base: z.number(),
      factor: z.number(),
      levels: z.array(z.number().positive()).max(100),
      round: z.boolean().optional(),
      range: z.number().optional(),
      rate: z.number().optional(),
      midpoint: z.number().optional(),
    },
    async ({ type, base, factor, levels, round, range, rate, midpoint }) => {
      if (type === "s_curve" && midpoint === undefined) {
        throw new Error("s_curve는 midpoint 명시 필수 (count 기반 기본값 없음)");
      }
      const results = levels.map((level) => ({
        level,
        value: computeAt({ type, base, factor, round, range, rate, midpoint }, level),
      }));
      return ok({ results });
    }
  );
}
