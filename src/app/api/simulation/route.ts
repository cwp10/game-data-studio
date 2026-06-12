import { NextRequest, NextResponse } from "next/server";
import { listColumns } from "@/lib/db/repo/columns";
import { readRows } from "@/lib/db/repo/rows";
import { listSimulations, saveSimulation, deleteSimulation } from "@/lib/db/repo/simulations";
import { getTable } from "@/lib/db/repo/tables";
import { runMonteCarlo } from "@/lib/simulation/combat";
import { runGachaSimulation } from "@/lib/simulation/gacha";
import { runDpsSimulation, type BuildSpec } from "@/lib/simulation/dps";
import { difficultyCurve, type StageInput } from "@/lib/simulation/difficulty";
import { winRateMatrix } from "@/lib/balance/correlate";
import { type Unit } from "@/lib/simulation/combat";
import { fitCurve } from "@/lib/curve/fit";
import { type CurveType } from "@/lib/curve/generate";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  return NextResponse.json(listSimulations(projectId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.action === "run") {
    const snapshot: Record<string, { columns: ReturnType<typeof listColumns>; rows: ReturnType<typeof readRows> }> = {};
    for (const tid of (body.input_tables ?? []) as string[]) {
      const table = getTable(tid);
      if (table) snapshot[tid] = { columns: listColumns(tid), rows: readRows(tid, { limit: 200 }) };
    }

    // fitCurve로 수식 자동 도출
    const targetCols: string[] = body.target_columns ?? [];
    const formulaLines: string[] = [];
    const formulaData: Array<{ xCol: string; yCol: string; type: CurveType; base: number; factor: number; r2: number }> = [];
    const CURVE_TYPES: CurveType[] = ["linear", "power", "exponential", "logarithmic", "quadratic"];
    const TYPE_LABELS: Record<CurveType, string> = {
      linear: "선형", power: "거듭제곱", exponential: "지수",
      logarithmic: "로그", quadratic: "2차", s_curve: "S-Curve",
    };
    const fmt = (n: number) => parseFloat(n.toPrecision(6)).toLocaleString("ko-KR", { maximumFractionDigits: 6 });

    for (const tid of (body.input_tables ?? []) as string[]) {
      const snap = snapshot[tid];
      if (!snap) continue;
      const colKeys = targetCols.filter((c) => c.startsWith(`${tid}.`)).map((c) => c.slice(tid.length + 1));
      if (colKeys.length < 2) continue;

      const xCol = colKeys[0];
      for (const yCol of colKeys.slice(1)) {
        const points = snap.rows
          .filter((r) => typeof r.data[xCol] === "number" && typeof r.data[yCol] === "number")
          .map((r) => ({ level: r.data[xCol] as number, value: r.data[yCol] as number }));
        if (points.length < 2) continue;

        // 모든 타입 피팅 → 최고 R² 선택
        let bestType: CurveType = "exponential";
        let bestR2 = -Infinity;
        for (const t of CURVE_TYPES) {
          const { r2 } = fitCurve(points, t);
          if (r2 > bestR2) { bestR2 = r2; bestType = t; }
        }
        const best = fitCurve(points, bestType);
        formulaData.push({ xCol, yCol, type: bestType, base: best.base, factor: best.factor, r2: best.r2 });

        // 수식 문자열
        let expr = "";
        if (bestType === "linear")      expr = `${yCol} = ${fmt(best.base)} + ${fmt(best.factor)} × (${xCol} - 1)`;
        else if (bestType === "power")  expr = `${yCol} = ${fmt(best.base)} × ${xCol}^${fmt(best.factor)}`;
        else if (bestType === "exponential") expr = `${yCol} = ${fmt(best.base)} × ${fmt(best.factor)}^(${xCol} - 1)`;
        else if (bestType === "logarithmic") expr = `${yCol} = ${fmt(best.base)} + ${fmt(best.factor)} × ln(${xCol})`;
        else if (bestType === "quadratic")   expr = `${yCol} = ${fmt(best.base)} + ${fmt(best.factor)} × (${xCol} - 1)²`;

        // 검증: 대표 레벨 샘플
        const maxLv = Math.max(...points.map((p) => p.level));
        const sampleLvs = [1, 5, 10, 20, 50].filter((lv) => lv <= maxLv);
        const verify = sampleLvs.map((lv) => {
          let v = 0;
          if (bestType === "linear")      v = best.base + best.factor * (lv - 1);
          else if (bestType === "power")  v = best.base * Math.pow(lv, best.factor);
          else if (bestType === "exponential") v = best.base * Math.pow(best.factor, lv - 1);
          else if (bestType === "logarithmic") v = best.base + best.factor * Math.log(lv);
          else if (bestType === "quadratic")   v = best.base + best.factor * Math.pow(lv - 1, 2);
          return `Lv${lv}=${Math.round(v).toLocaleString("ko-KR")}`;
        }).join("  /  ");

        formulaLines.push(`[${yCol}]  ${TYPE_LABELS[bestType]} 곡선  (R²=${best.r2.toFixed(3)})\n${expr}\n검증: ${verify}`);
      }
    }

    const formula = formulaLines.length > 0
      ? formulaLines.join("\n\n")
      : "컬럼을 2개 이상 선택하세요 (X 컬럼 + Y 컬럼).";

    return NextResponse.json({ snapshot, target_columns: body.target_columns ?? [], formula, formulaData });
  }
  if (body.action === "montecarlo") {
    const attacker = body.attacker;
    const defender = body.defender;
    if (!Array.isArray(attacker) || attacker.length === 0 || !Array.isArray(defender) || defender.length === 0) {
      return NextResponse.json({ error: "attacker and defender must be non-empty arrays" }, { status: 400 });
    }
    const rawIterations = Number(body.iterations);
    if (!Number.isFinite(rawIterations) || rawIterations < 1) {
      return NextResponse.json({ error: "iterations must be a positive number" }, { status: 400 });
    }
    const iterations = Math.min(100000, Math.max(1, Math.floor(rawIterations)));
    const seed = Number.isFinite(Number(body.seed)) ? Math.floor(Number(body.seed)) : 0;
    return NextResponse.json(runMonteCarlo(attacker, defender, iterations, seed));
  }
  if (body.action === "gacha") {
    const baseRate = Number(body.baseRate);
    if (!Number.isFinite(baseRate) || baseRate < 0 || baseRate > 1) {
      return NextResponse.json({ error: "baseRate must be between 0 and 1" }, { status: 400 });
    }
    const pityCap = Number(body.pityCap);
    if (!Number.isFinite(pityCap) || pityCap < 1) {
      return NextResponse.json({ error: "pityCap must be >= 1" }, { status: 400 });
    }
    const pityStart = Number.isFinite(Number(body.pityStart)) ? Math.floor(Number(body.pityStart)) : 0;
    const rawIterations = Number(body.iterations);
    if (!Number.isFinite(rawIterations) || rawIterations < 1) {
      return NextResponse.json({ error: "iterations must be a positive number" }, { status: 400 });
    }
    const iterations = Math.min(1000000, Math.max(1, Math.floor(rawIterations)));
    const seed = Number.isFinite(Number(body.seed)) ? Math.floor(Number(body.seed)) : 0;
    return NextResponse.json(runGachaSimulation(baseRate, pityStart, pityCap, iterations, seed));
  }
  if (body.action === "dps") {
    const builds = body.builds as BuildSpec[];
    if (!Array.isArray(builds) || builds.length === 0) {
      return NextResponse.json({ error: "builds must be a non-empty array" }, { status: 400 });
    }
    const rawIterations = Number(body.iterations);
    if (!Number.isFinite(rawIterations) || rawIterations < 1) {
      return NextResponse.json({ error: "iterations must be a positive number" }, { status: 400 });
    }
    const iterations = Math.min(20000, Math.max(1, Math.floor(rawIterations)));
    const seed = Number.isFinite(Number(body.seed)) ? Math.floor(Number(body.seed)) : 0;
    return NextResponse.json(runDpsSimulation(builds, iterations, seed));
  }
  if (body.action === "difficulty") {
    const stages = body.stages as StageInput[];
    if (!Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ error: "stages must be a non-empty array" }, { status: 400 });
    }
    const rawIterations = Number(body.iterations);
    if (!Number.isFinite(rawIterations) || rawIterations < 1) {
      return NextResponse.json({ error: "iterations must be a positive number" }, { status: 400 });
    }
    const iterations = Math.min(20000, Math.max(1, Math.floor(rawIterations)));
    const secondsPerTurn = Number.isFinite(Number(body.secondsPerTurn)) ? Number(body.secondsPerTurn) : 1;
    const seed = Number.isFinite(Number(body.seed)) ? Math.floor(Number(body.seed)) : 0;
    return NextResponse.json(difficultyCurve(body.player, stages, secondsPerTurn, iterations, seed));
  }
  if (body.action === "winmatrix") {
    const units = body.units as Unit[];
    if (!Array.isArray(units) || units.length < 2) {
      return NextResponse.json({ error: "units must be an array of at least 2 units" }, { status: 400 });
    }
    const rawIterations = Number(body.iterations);
    if (!Number.isFinite(rawIterations) || rawIterations < 1) {
      return NextResponse.json({ error: "iterations must be a positive number" }, { status: 400 });
    }
    const iterations = Math.min(5000, Math.max(1, Math.floor(rawIterations)));
    const seed = Number.isFinite(Number(body.seed)) ? Math.floor(Number(body.seed)) : 0;
    const maxUnits = Number.isFinite(Number(body.maxUnits)) ? Math.floor(Number(body.maxUnits)) : undefined;
    return NextResponse.json(winRateMatrix(units, iterations, seed, maxUnits));
  }
  if (body.action) {
    return NextResponse.json({ error: `unknown action: ${body.action}` }, { status: 400 });
  }
  return NextResponse.json(saveSimulation(body), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteSimulation(id);
  return new NextResponse(null, { status: 204 });
}
