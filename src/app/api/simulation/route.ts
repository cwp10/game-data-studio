import { NextRequest, NextResponse } from "next/server";
import { listColumns } from "@/lib/db/repo/columns";
import { readRows } from "@/lib/db/repo/rows";
import { listSimulations, saveSimulation } from "@/lib/db/repo/simulations";
import { getTable } from "@/lib/db/repo/tables";
import { runMonteCarlo } from "@/lib/simulation/combat";
import { runGachaSimulation } from "@/lib/simulation/gacha";
import { runDpsSimulation, type BuildSpec } from "@/lib/simulation/dps";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  return NextResponse.json(listSimulations(projectId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.action === "run") {
    const snapshot: Record<string, unknown> = {};
    for (const tid of body.input_tables ?? []) {
      const table = getTable(tid);
      if (table) snapshot[tid] = { table, columns: listColumns(tid), rows: readRows(tid, { limit: 200 }) };
    }
    return NextResponse.json({ snapshot, target_columns: body.target_columns ?? [] });
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
  return NextResponse.json(saveSimulation(body), { status: 201 });
}
