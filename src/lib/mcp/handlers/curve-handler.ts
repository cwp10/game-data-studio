import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { generateCurveIntoTable } from "../../curve/apply.js";
import { computeAt } from "../../curve/generate.js";
import { solveCurve } from "../../curve/solve.js";
import { fitCurve } from "../../curve/fit.js";
import { readRows } from "../../db/repo/rows.js";
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
    "fit_from_table",
    "기존 레벨 테이블의 행 데이터를 읽어 곡선 파라미터를 자동 역산. 무한 레벨 공식으로 전환할 때 사용. filter_column/filter_value로 특정 그룹(예: 영웅 ID)만 대상 지정 가능. 반환: { base, factor, r2, rowCount, maxErrorPct, meanErrorPct, preview[{level,original,fitted,diffPct}] }",
    {
      table_id: z.string(),
      level_column: z.string(),
      value_column: z.string(),
      type: z.enum(["linear", "power", "exponential", "logarithmic", "quadratic", "s_curve"]),
      filter_column: z.string().optional(),
      filter_value: z.string().optional(),
    },
    async ({ table_id, level_column, value_column, type, filter_column, filter_value }) => {
      const allRows = readRows(table_id, { limit: 5000 });
      const rows = (filter_column && filter_value)
        ? allRows.filter((r) => String(r.data[filter_column] ?? "") === filter_value)
        : allRows;

      const points = rows
        .map((r) => ({ level: Number(r.data[level_column]), value: Number(r.data[value_column]) }))
        .filter((p) => isFinite(p.level) && isFinite(p.value) && p.level > 0);

      if (points.length < 2) {
        throw new Error(`유효한 (level, value) 쌍이 부족합니다 (${points.length}개). 컬럼명을 확인하세요.`);
      }

      const fit = fitCurve(points, type);
      const opts = { type, base: fit.base, factor: fit.factor, range: fit.range, rate: fit.rate, midpoint: fit.midpoint };

      const errors = points.map((p) => {
        const fitted = computeAt(opts, p.level);
        return p.value !== 0 ? Math.abs(fitted - p.value) / Math.abs(p.value) * 100 : 0;
      });

      // 12개 샘플 균등 추출
      const sorted = [...points].sort((a, b) => a.level - b.level);
      const step = Math.max(1, Math.floor(sorted.length / 12));
      const preview = sorted.filter((_, i) => i % step === 0).slice(0, 12).map((p) => {
        const fitted = computeAt(opts, p.level);
        const diffPct = p.value !== 0 ? Math.round(Math.abs(fitted - p.value) / Math.abs(p.value) * 1000) / 10 : 0;
        return { level: p.level, original: p.value, fitted, diffPct };
      });

      return ok({
        base: Math.round(fit.base * 1000) / 1000,
        factor: Math.round((fit.factor) * 1000) / 1000,
        ...(fit.range !== undefined ? { range: fit.range, rate: fit.rate, midpoint: fit.midpoint } : {}),
        r2: Math.round(fit.r2 * 10000) / 10000,
        rowCount: points.length,
        maxErrorPct: Math.round(Math.max(...errors) * 10) / 10,
        meanErrorPct: Math.round((errors.reduce((a, b) => a + b, 0) / errors.length) * 10) / 10,
        preview,
      });
    }
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
